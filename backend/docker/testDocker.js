import { executeCode } from "./executeCodeDocker.js";

function runTest(name, code, language) {
  return new Promise((resolve) => {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🧪 ${name}`);
    console.log(`${"=".repeat(50)}`);

    const start = Date.now();

    executeCode(code, language, {
      onStdout: (data) => {
        process.stdout.write(`  [stdout] ${data.toString()}`);
      },
      onStderr: (data) => {
        process.stdout.write(`  [stderr] ${data.toString()}`);
      },
      onExit: (code) => {
        const time = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`\n  Result: Exit ${code} | ${time}s | ${code === 0 ? "PASS ✅" : "KILLED/FAIL ❌"}`);
        resolve(code);
      },
      onError: (err) => {
        console.log(`  Error: ${err.message}`);
        resolve(1);
      },
    });
  });
}

async function main() {
  console.log("\n🐳 DOCKER SANDBOX TEST SUITE");
  console.log(`📅 ${new Date().toLocaleString()}\n`);

  // ========== LANGUAGE TESTS ==========

  await runTest(
    "TEST 1: JavaScript",
    `console.log("Hello from JS!");
     console.log("2 + 2 =", 2 + 2);
     console.log("Array:", [1,2,3].map(x => x * 10));`,
    "JavaScript"
  );

  await runTest(
    "TEST 2: Python",
    `print("Hello from Python!")
print("Sum:", sum(range(10)))
for i in range(3):
    print(f"  Count: {i}")`,
    "Python"
  );

  await runTest(
    "TEST 3: C++",
    `#include <iostream>
using namespace std;
int main() {
    cout << "Hello from C++!" << endl;
    for(int i = 1; i <= 3; i++) {
        cout << "  Count: " << i << endl;
    }
    return 0;
}`,
    "C++"
  );

  await runTest(
    "TEST 4: Java",
    `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
        for(int i = 1; i <= 3; i++) {
            System.out.println("  Count: " + i);
        }
    }
}`,
    "Java"
  );

  // ========== SECURITY TESTS ==========

  // TEST 5: Security — Try to access HOST files (should only see container files)
  await runTest(
    "TEST 5: SECURITY — Container isolation check",
    `const fs = require('fs');
const os = require('os');
console.log("Hostname:", os.hostname());
console.log("User:", os.userInfo().username);
console.log("Platform:", os.platform());
try {
    // This reads the CONTAINER's /etc/passwd, NOT your Windows files
    const data = fs.readFileSync('/etc/passwd', 'utf8');
    const hasSandbox = data.includes('sandbox');
    const hasRoot = data.includes('root');
    console.log("Sees sandbox user:", hasSandbox);
    console.log("Sees root user:", hasRoot);
    console.log("SAFE: This is the container's file, not host");
} catch(e) {
    console.log("SAFE: Cannot read files:", e.message);
}
// Try to access Windows files (should fail completely)
try {
    fs.readFileSync('C:\\\\Users\\\\garvi\\\\.env', 'utf8');
    console.log("DANGER: Can access Windows files!");
} catch(e) {
    console.log("SAFE: Cannot access Windows files");
}`,
    "JavaScript"
  );

  await runTest(
    "TEST 6: SECURITY — Is network blocked?",
    `import urllib.request
try:
    urllib.request.urlopen('http://google.com', timeout=3)
    print("DANGER: Network accessible!")
except Exception as e:
    print(f"SAFE: Network blocked")`,
    "Python"
  );

  await runTest(
    "TEST 7: SECURITY — Does infinite loop get killed?",
    `while True:
    pass`,
    "Python"
  );

  // ========== SUMMARY ==========
  console.log(`\n${"=".repeat(50)}`);
  console.log("🏁 ALL TESTS COMPLETE!");
  console.log(`${"=".repeat(50)}`);
  console.log(`
Expected Results:
  TEST 1-4: Should PASS ✅ (exit code 0)
  TEST 5:   Container sees ITS OWN /etc/passwd (not your PC's)
  TEST 6:   Should print "SAFE: Network blocked"
  TEST 7:   Should get KILLED after ~15 seconds (exit 137) ← This is CORRECT behavior
  `);

  process.exit(0);
}

main();