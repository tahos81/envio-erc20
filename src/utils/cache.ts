import sqlite3 from "sqlite3";
import fs from "fs";

const csvPath = "wallets.csv";
const db = new sqlite3.Database(".cache/cache.db");

export class AccountCache {
  private static instance: AccountCache | null = null;

  static async init() {
    if (this.instance) {
      return this.instance;
    }

    const cache = new AccountCache("cache");
    await cache.createTableIfNotExists();

    const addresses = fs
      .readFileSync(csvPath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        for (const address of addresses) {
          cache.addStmt?.run([address], (err) => {
            if (err) {
              console.error(`Error adding address ${address}:`, err);
            }
          });
        }

        db.run("COMMIT", (err) => {
          if (err) {
            console.error("Error committing transaction:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    this.instance = cache;
    return cache;
  }

  private readonly key: string;
  private existsStmt: sqlite3.Statement | null = null;
  private addStmt: sqlite3.Statement | null = null;

  private constructor(key: string) {
    this.key = key;
  }

  private async createTableIfNotExists() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.key} (
        address TEXT PRIMARY KEY
      )
    `;

    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_${this.key}_address ON ${this.key}(address)
    `;

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run(createTableQuery, (err) => {
          if (err) {
            console.error("Error creating table:", err);
            reject(err);
          }
        });

        db.run(createIndexQuery, (err) => {
          if (err) {
            console.error("Error creating index:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    this.existsStmt = db.prepare(`SELECT 1 FROM ${this.key} WHERE address = ?`);
    this.addStmt = db.prepare(
      `INSERT OR IGNORE INTO ${this.key} (address) VALUES (?)`
    );
  }

  public async exists(address: string) {
    if (!this.existsStmt) {
      throw new Error("Cache not initialized");
    }

    return new Promise<boolean>((resolve, reject) => {
      this.existsStmt!.get([address], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  public async add(address: string): Promise<boolean> {
    if (!this.addStmt) {
      throw new Error("Cache not initialized");
    }

    return new Promise<boolean>((resolve, reject) => {
      this.addStmt!.run([address], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }
}
