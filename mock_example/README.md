# Mock Example - Hello Function

A simple Node.js project demonstrating a hello function.

## Files

- `hello.js` - Main file containing the hello function
- `test.js` - Test file demonstrating the function usage
- `package.json` - Node.js project configuration

## Usage

### Running the hello function directly:
```bash
node hello.js
```

### Running tests:
```bash
node test.js
```

Or using npm:
```bash
npm test
```

### Using in your code:
```javascript
const hello = require('./hello');

console.log(hello());           // Output: Hello, World!
console.log(hello('Node.js'));  // Output: Hello, Node.js!
```

## Function Signature

```javascript
hello(name = 'World')
```

**Parameters:**
- `name` (string, optional) - The name to greet. Defaults to 'World'.

**Returns:**
- (string) - A greeting message in the format "Hello, {name}!"
