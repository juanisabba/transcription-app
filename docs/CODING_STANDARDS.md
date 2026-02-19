# Coding Standards

## Strict Typing

- ❌ No `any` jamás
- ✅ Tipado explícito siempre

## Inyección de Dependencias

- ✅ constructor(private repo: IUserRepository) {}
- ❌ this.repo = new UserRepository()

## Naming

- UseCase: RegisterUserUseCase.ts
- Repository: UserRepository.ts
- Handler: register.handler.ts
- Interface: IUserRepository.ts

## Errores

- ✅ class UserAlreadyExistsError extends AppError
- ❌ throw new Error("User exists")

## Path Aliases

- ✅ import { RegisterUserUseCase } from '@core/use-cases/auth'
- ❌ import { RegisterUserUseCase } from '../../../core/use-cases/auth'
