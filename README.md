# halstead-metrics

Monorepo for Halstead software-science metrics on Java, C, and C++. It follows the [Halstead Metrics Tool](https://sourceforge.net/projects/halsteadmetricstool): the same operator and operand classification, the same formulas, a desktop browser for a single source file, and detailed HTML and PDF reports.

## Packages

| Package | Role |
| --- | --- |
| `packages/halstead-metrics` | Core library. Tokenizes source, classifies operators and operands, and renders the HTML and PDF reports. |
| `packages/halstead-metrics-cli` | `halstead <path>` prints the JSON report to stdout. |
| `packages/halstead-metrics-desktop` | Desktop application. Browse files, read the metrics, and open an HTML or PDF report. |

## Desktop application

```bash
npm install
npm start
```

The window matches the Java tool. A file tree is on the left. **Metrics Value** shows the file name and the calculated measures. **Source code** shows the file with keywords, strings, comments, and numbers highlighted. **View HTML Report** and **View PDF Report** write `Name.html` or `Name.pdf` next to the source file (the stem is everything before the first dot) and open it.

**File → Open File...** jumps the tree to a `.java`, `.c`, `.cc`, `.cpp`, or `.c++` file. **File → Exit** quits.

The HTML report is the detailed report: file name, operator counts, operand counts, and the metric values. The PDF report has the same sections in a printable layout. Counts are the classified totals. Metric values are rounded to two decimal places with half-even rounding, and whole numbers are shown with one decimal place (`5.0`), matching the Java `DecimalFormat` output.

## Command line

```bash
npm run cli -- examples/Sample.java
node packages/halstead-metrics-cli/index.js examples/hello.c
```

With `packages/halstead-metrics-cli` installed, the `halstead` command does the same thing:

```bash
halstead <path>
```

Supported extensions are `.java`, `.c`, `.cc`, `.cpp`, and `.c++`.

No arguments, `-h`, `--help`, and `-help` print usage and exit `1`. An unreadable path exits `2`. Any other extension exits `3`.

Stdout is one JSON object:

```json
{
  "Halstead": {
    "n1": 3,
    "n2": 2,
    "N1": 3,
    "N2": 2,
    "Vocabulary": 5,
    "Length": 5,
    "Estimated program length": 6.75,
    "Volume": 11.61,
    "Difficulty": 1.5,
    "Effort": 17.41,
    "Programming time": 0.97,
    "Purity ratio": 1.35,
    "_Operands": { "x": "1", "1": "1" },
    "_Operators": { "int": "1", ";": "1", "=": "1" }
  },
  "filename": "Sample.java"
}
```

Counts inside `_Operands` and `_Operators` are strings, matching the original CLI. `filename` is the path you passed in.

| Field | Formula |
| --- | --- |
| n1, N1 | Distinct and total operators |
| n2, N2 | Distinct and total operands |
| Vocabulary | n1 + n2 |
| Length | N1 + N2 |
| Estimated program length | n1 log2(n1) + n2 log2(n2) |
| Purity ratio | estimated length / length |
| Volume | length × log2(vocabulary) |
| Difficulty | (n1 / 2) × (N2 / n2) |
| Effort | volume × difficulty |
| Programming time | effort / 18 |

## What counts as an operator

The classifier follows `KeywordAnalyzer`, `SymbolAnalyzer`, `BracesAnalyzer`, and `LiteralAnalyzer`:

- Language keywords are operators. `.cc` and `.c++` are lexed as C++ but, as in the Java tool, the C++ keyword list is applied only for `.cpp`.
- These symbols are operators: `+` `++` `-` `--` `*` `.` `;` `/` `%` `!` `>` `<` `>=` `<=` `==` `=` `:` `~`.
- When a brace pair is balanced, `{ }`, `( )`, `[ ]`, or `< >` is an extra operator. The individual `(` `)` `{` `}` `[` `]` tokens are still operands.
- String literals and every remaining token (identifiers, numbers, other punctuation) are operands.
- Whitespace, comments, and preprocessor lines are skipped.

## API

```javascript
const { analyzeSource, reportSource, renderHtmlReport, renderPdfReport } = require("halstead-metrics");

const metrics = analyzeSource("int x = 1;", "java");
const report = reportSource("int x = 1;", "java", "Sample.java");
const html = renderHtmlReport(metrics, "Sample.java");
const pdf = await renderPdfReport(metrics, "Sample.java");
```

`analyzeSource` takes the source text and the extension without a dot (`java`, `c`, `cc`, `cpp`, or `c++`). `renderHtmlReport` returns a string. `renderPdfReport` returns a `Buffer`.

## Tests

Unit tests cover classification, rounding, report text, the CLI exit codes, source highlighting, and file reading. Integration tests run the checked-in Java, C, and C++ examples through the library and the CLI, and drive the desktop page: open a file, read the metrics, export HTML and PDF, expand a folder, and use File Open.

```bash
npm test
npm run test:unit
npm run test:integration
```

GitHub Actions runs both on `ubuntu-latest` for every push and pull request. The job does not download Electron, so it stays inside the free GitHub-hosted runner minutes.
