import type { MigrationInterface, QueryRunner } from "typeorm";

export class DiscoveryFilters1725000000000 implements MigrationInterface {
  name = "DiscoveryFilters1725000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "discovery_filters" TEXT NOT NULL DEFAULT '{"excluded":[],"sort":"popular"}'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "discovery_filters"`
    );
  }
}
