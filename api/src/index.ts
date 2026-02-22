export const handler = () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hola" }),
    headers: { "Content-Type": "application/json" },
  };
};
