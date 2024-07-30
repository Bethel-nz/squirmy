export default function measureExecutionTime<T>(
  func: () => Promise<T>
): Promise<[T, number]> {
  const start = process.hrtime();
  return func().then((result) => {
    const end = process.hrtime(start);
    const executionTime = (end[0] * 1000 + end[1] / 1e6).toFixed(2); // Convert to milliseconds
    return [result, parseFloat(executionTime)];
  });
}
