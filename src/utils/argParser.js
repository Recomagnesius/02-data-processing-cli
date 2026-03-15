export function argParser(line) {
  const input = line.trim().split(/\s+/);

  const result = {
    command: input[0] || '',
    args: [],
    options: {}
  };

  for (let i = 1; i < input.length; i++) {
    const token = input[i];
    const nextToken = input[i + 1] || null;

    if (token.startsWith('--')) {
      const key = token.slice(2);

      if (!nextToken || nextToken.startsWith('--')) {
        result.options[key] = true;
      } else {
        result.options[key] = nextToken;
        i++;
      }
    } else {
      result.args.push(token);
    }
  }

  return result;
}