import axios from "axios";

// Piston API version mapping
const PISTON_MAP = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  cpp: { language: "c++", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
};

// Change parameter from 'code' to 'files'
export async function executeCode(files, language, stdin, { onStdout, onStderr, onExit, onError }) {
  const langKey = language.toLowerCase() === "c++" ? "cpp" : language.toLowerCase();
  const config = PISTON_MAP[langKey];

  if (!config) {
    onStderr(Buffer.from(`Unsupported language: ${language}\n`));
    onExit(1);
    return null;
  }

  onStdout(Buffer.from(`🚀 Sending ${language} to secure execution engine...\n`));

  try {
    const response = await axios.post("https://api.onlinecompiler.io/api/v2/piston/execute", {
      language: config.language,
      version: config.version,
      files: files, // Pass the entire array directly here!
      stdin: stdin || "",
      compile_timeout: 10000,
      run_timeout: 15000,
    }, {
      headers: {
        Authorization: process.env.PISTON_API_KEY
      }
    });
    

    const result = response.data;

    // Handle compilation errors (C++ / Java)
    if (result.compile && result.compile.code !== 0) {
      onStderr(Buffer.from(result.compile.stderr || result.compile.output));
      onExit(result.compile.code);
      return null;
    }

    // Output results
    if (result.run.stdout) onStdout(Buffer.from(result.run.stdout));
    if (result.run.stderr) onStderr(Buffer.from(result.run.stderr));

    // Handle timeouts or memory limits
    if (result.run.signal === "SIGKILL") {
      onStderr(Buffer.from("\n⏰ Execution timed out or exceeded memory limits.\n"));
    }

    onExit(result.run.code || 0);

  } catch (err) {
    onError(err);
    onExit(1);
  }

  return { kill: () => {} }; // Dummy kill function to prevent frontend disconnect crashes
}