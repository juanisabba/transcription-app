export const handler = (_event: unknown) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      message: "Hello from Vocali API!",
      status: "success",
    }),
  };
};
