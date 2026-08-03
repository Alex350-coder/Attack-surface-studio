import { Module } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { DrizzleUsersRepository } from "./repositories/users.repository";
import { USERS_REPOSITORY } from "./users.tokens";

@Module({
  providers: [
    {
      provide: USERS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleUsersRepository(db),
      inject: [DATABASE_CONNECTION],
    },
  ],
  exports: [USERS_REPOSITORY],
})
export class UsersModule {}
