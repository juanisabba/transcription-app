import { LogoutUserUC } from "../LogoutUserUC";
import { createMockAuthService } from "../../../../../../tests/mocks";

describe("LogoutUserUC", () => {
  const mockAuthService = createMockAuthService();
  let useCase: LogoutUserUC;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LogoutUserUC(mockAuthService);
  });

  it("should complete logout without errors", async () => {
    await expect(useCase.execute("user-id-123")).resolves.toBeUndefined();
  });

  it("should accept any userId without making external calls", async () => {
    await useCase.execute("any-user-id");
    expect(mockAuthService.authenticateWithPassword).not.toHaveBeenCalled();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });
});
