import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { apiResponse } from "../helpers/responseHelper";

export const handler: APIGatewayProxyHandler = (event): Promise<APIGatewayProxyResult> => {
  return Promise.resolve(
    apiResponse(200, { message: "Hello from Vocali API!", status: "success" }, { event })
  );
};
