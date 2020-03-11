import { Injectable } from '@nestjs/common';
import * as persist from 'node-persist';

@Injectable()
export class MemoryService {
  private _storage: any;

  constructor() {
    persist.init();
  }

  async setItem(key: string, val: string) {
    await persist.setItem(key, val);
  }

  async getItem(key: string) {
    await persist.getItem(key);
  }
}
