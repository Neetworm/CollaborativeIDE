import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive:true, force:true }); } catch(e) {}
}

export function executeCode(code, language, { onStdout, onStderr, onExit, onError }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "codecollab-"));

  try {
    switch (language) {
      case "javascript": case "JavaScript": {
        const fp = path.join(tmpDir, "main.js");
        fs.writeFileSync(fp, code);
        const child = spawn("node", [fp], { timeout:30000, cwd:tmpDir });
        wire(child, tmpDir, onStdout, onStderr, onExit, onError);
        return child;
      }
      case "python": case "Python": {
        const fp = path.join(tmpDir, "main.py");
        fs.writeFileSync(fp, code);
        // Try python3 first, fall back to python
        const cmd = process.platform === "win32" ? "python" : "python3";
        const child = spawn(cmd, [fp], { timeout:30000, cwd:tmpDir });
        wire(child, tmpDir, onStdout, onStderr, onExit, onError);
        return child;
      }
      case "cpp": case "C++": {
        const src = path.join(tmpDir, "main.cpp");
        const out = path.join(tmpDir, "main");
        fs.writeFileSync(src, code);
        const compile = spawn("g++", [src, "-o", out], { timeout:30000, cwd:tmpDir });
        compile.stderr.on("data", onStderr);
        compile.on("error", (e) => { onError(e); cleanup(tmpDir); });
        compile.on("close", (c) => {
          if (c !== 0) { onExit(c); cleanup(tmpDir); return; }
          const run = spawn(out, [], { timeout:30000, cwd:tmpDir });
          wire(run, tmpDir, onStdout, onStderr, onExit, onError);
        });
        return compile;
      }
      case "java": case "Java": {
        const fp = path.join(tmpDir, "Main.java");
        fs.writeFileSync(fp, code);
        const compile = spawn("javac", [fp], { timeout:30000, cwd:tmpDir });
        compile.stderr.on("data", onStderr);
        compile.on("error", (e) => { onError(e); cleanup(tmpDir); });
        compile.on("close", (c) => {
          if (c !== 0) { onExit(c); cleanup(tmpDir); return; }
          const run = spawn("java", ["-cp", tmpDir, "Main"], { timeout:30000, cwd:tmpDir });
          wire(run, tmpDir, onStdout, onStderr, onExit, onError);
        });
        return compile;
      }
      default:
        onStderr(Buffer.from(`Unsupported language: ${language}`));
        onExit(1); cleanup(tmpDir);
        return null;
    }
  } catch (err) {
    onError(err); cleanup(tmpDir);
    return null;
  }
}

function wire(child, tmpDir, onStdout, onStderr, onExit, onError) {
  child.stdout.on("data", onStdout);
  child.stderr.on("data", onStderr);
  child.on("close", (c) => { onExit(c); cleanup(tmpDir); });
  child.on("error", (e) => { onError(e); cleanup(tmpDir); });
}