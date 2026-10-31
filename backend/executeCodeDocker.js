import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

// Windows path fix for Docker volume mounts
function toDockerPath(windowsPath) {
  if (os.platform() !== "win32") return windowsPath;
  return windowsPath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

const CONFIG = {
  memory: "50m",
  cpus: "0.5",
  timeout: 15000,
  maxOutputSize: 512 * 1024,
  images: {
    javascript: "sandbox-node",
    python: "sandbox-python",
    cpp: "sandbox-cpp",
    java: "sandbox-java",
  },
};

const LANG_CONFIG = {
  javascript: {
    fileName: "main.js",
    needsCompile: false,
    compileCmd: null,
    runCmd: "node /code/main.js",
  },
  python: {
    fileName: "main.py",
    needsCompile: false,
    compileCmd: null,
    runCmd: "python3 -u /code/main.py",
  },
  cpp: {
    fileName: "main.cpp",
    needsCompile: true,
    compileCmd: "cp /code/main.cpp /tmp/ && g++ /tmp/main.cpp -o /tmp/main -std=c++17",
    runCmd: "/tmp/main",
  },
  java: {
    fileName: "Main.java",
    needsCompile: true,
    compileCmd: "cp /code/Main.java /tmp/ && javac /tmp/Main.java",
    runCmd: "java -cp /tmp -Xmx30m Main",
  },
};

function cleanup(dir, containerName) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {}
  if (containerName) {
    try {
      spawn("docker", ["rm", "-f", containerName], { stdio: "ignore" });
    } catch (e) {}
  }
}

function normalizeLang(language) {
  const map = {
    javascript: "javascript",
    JavaScript: "javascript",
    python: "python",
    Python: "python",
    cpp: "cpp",
    "c++": "cpp",
    "C++": "cpp",
    java: "java",
    Java: "java",
  };
  return map[language] || null;
}

export function executeCode(
  code,
  language,
  { onStdout, onStderr, onExit, onError }
) {
  const lang = normalizeLang(language);
  if (!lang) {
    onStderr(Buffer.from(`Unsupported language: ${language}`));
    onExit(1);
    return null;
  }

  const config = LANG_CONFIG[lang];
  const image = CONFIG.images[lang];
  const containerName = `sb-${crypto.randomBytes(4).toString("hex")}`;

  // Create temp dir and write code file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sandbox-"));
  const codePath = path.join(tmpDir, config.fileName);
  fs.writeFileSync(codePath, code);

  // Convert Windows path for Docker
  const dockerTmpDir = toDockerPath(tmpDir);

  // Build the command that runs INSIDE the container
  let innerCmd;
  if (config.needsCompile) {
    innerCmd = `${config.compileCmd} && ${config.runCmd}`;
  } else {
    innerCmd = config.runCmd;
  }

  // Docker run arguments
  const dockerArgs = [
    "run",
    "--rm",
    "--name",
    containerName,

    // Resource limits
    "--memory",
    CONFIG.memory,
    "--cpus",
    CONFIG.cpus,
    "--pids-limit",
    "50",

    // Network isolation — NO internet access
    "--network",
    "none",

    // Security — prevent privilege escalation
    "--security-opt",
    "no-new-privileges",

    // Security — drop all Linux capabilities
    "--cap-drop",
    "ALL",

    // Mount code as READ-ONLY
    "-v",
    `${dockerTmpDir}:/code:ro`,

    // Use the sandbox image
    image,

    // Run command inside container
    "sh",
    "-c",
    innerCmd,
  ];

  onStdout(Buffer.from(`🐳 Running ${language} in Docker sandbox...\n`));

  const child = spawn("docker", dockerArgs, { timeout: CONFIG.timeout });

  let totalOutput = 0;
  let killed = false;

  child.stdout.on("data", (data) => {
    totalOutput += data.length;
    if (totalOutput > CONFIG.maxOutputSize && !killed) {
      killed = true;
      onStderr(
        Buffer.from("\n⚠️ Output limit exceeded. Container killed.\n")
      );
      spawn("docker", ["kill", containerName], { stdio: "ignore" });
      return;
    }
    onStdout(data);
  });

  child.stderr.on("data", (data) => {
    totalOutput += data.length;
    if (totalOutput > CONFIG.maxOutputSize && !killed) {
      killed = true;
      spawn("docker", ["kill", containerName], { stdio: "ignore" });
      return;
    }
    onStderr(data);
  });

  child.on("close", (exitCode) => {
    onExit(exitCode);
    cleanup(tmpDir, containerName);
  });

  child.on("error", (err) => {
    onError(err);
    cleanup(tmpDir, containerName);
  });

  // Backup force-kill after timeout
  let timeoutFired = false;  
  setTimeout(() => {
    if (!killed && !timeoutFired) {  
      timeoutFired = true;           
      killed = true;
      try {
        spawn("docker", ["kill", containerName], { stdio: "ignore" });
      } catch (e) {}
      onStderr(Buffer.from("\n⏰ Timed out. Container killed.\n"));
    }
  }, CONFIG.timeout + 2000);

  return child;
}