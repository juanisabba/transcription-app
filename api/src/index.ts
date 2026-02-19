// Punto de entrada principal
console.log('Vocali API initialized');

export const handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello' }),
    headers: { 'Content-Type': 'application/json' },
  };
};
