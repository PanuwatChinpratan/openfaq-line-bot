import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  available = false;

  async connectSafely(): Promise<boolean> {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.available) await this.$disconnect();
  }
}
