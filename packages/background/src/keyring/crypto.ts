import scrypt from "scrypt-js";
import AES, { Counter } from "aes-js";
import { BIP44HDPath, CoinTypeForChain } from "./types";
import { Hash, RNG } from "@keplr-wallet/crypto";

import { Buffer } from "buffer/";

interface ScryptParams {
  dklen: number;
  salt: string;
  n: number;
  r: number;
  p: number;
}

/**
 * This is similar to ethereum's key store.
 * But, the encryped data is not the private key, but the mnemonic words.
 */
export interface KeyStore {
  version: "1.2";
  /**
   * Type can be "mnemonic" or "privateKey".
   * Below version "1", type is not defined and it is considered as "mnemonic".
   */
  type?: "mnemonic" | "privateKey" | "ledger";
  coinTypeForChain: CoinTypeForChain;
  bip44HDPath?: BIP44HDPath;
  meta?: {
    [key: string]: string;
  };
  crypto: {
    cipher: "aes-128-ctr";
    cipherparams: {
      iv: string;
    };
    ciphertext: string;
    kdf: "scrypt";
    kdfparams: ScryptParams;
    mac: string;
  };
}

export class Crypto {
  public static async encrypt(
    rng: RNG,
    type: "mnemonic" | "privateKey" | "ledger",
    text: string,
    password: string,
    meta: Record<string, string>,
    bip44HDPath?: BIP44HDPath
  ): Promise<KeyStore> {
    let random = new Uint8Array(32);
    const salt = Buffer.from(await rng(random)).toString("hex");

    const scryptParams: ScryptParams = {
      salt,
      dklen: 32,
      n: 131072,
      r: 8,
      p: 1,
    };
    const derivedKey = await Crypto.scrpyt(password, scryptParams);
    const buf = Buffer.from(text);

    random = new Uint8Array(16);
    const iv = Buffer.from(await rng(random));

    const counter = new Counter(0);
    counter.setBytes(iv);
    const aesCtr = new AES.ModeOfOperation.ctr(derivedKey, counter);
    const ciphertext = Buffer.from(aesCtr.encrypt(buf));
    // Mac is sha256(last 16 bytes of derived key + ciphertext)
    const mac = Hash.sha256(
      Buffer.concat([
        Buffer.from(derivedKey.slice(derivedKey.length / 2)),
        ciphertext,
      ])
    );
    return {
      version: "1.2",
      type,
      coinTypeForChain: {},
      bip44HDPath,
      meta,
      crypto: {
        cipher: "aes-128-ctr",
        cipherparams: {
          iv: iv.toString("hex"),
        },
        ciphertext: ciphertext.toString("hex"),
        kdf: "scrypt",
        kdfparams: scryptParams,
        mac: Buffer.from(mac).toString("hex"),
      },
    };
  }

  public static async decrypt(
    keyStore: KeyStore,
    password: string
  ): Promise<Uint8Array> {
    const derivedKey = await Crypto.scrpyt(password, keyStore.crypto.kdfparams);

    const counter = new Counter(0);
    counter.setBytes(Buffer.from(keyStore.crypto.cipherparams.iv, "hex"));
    const aesCtr = new AES.ModeOfOperation.ctr(derivedKey, counter);

    const mac = Hash.sha256(
      Buffer.concat([
        Buffer.from(derivedKey.slice(derivedKey.length / 2)),
        Buffer.from(keyStore.crypto.ciphertext, "hex"),
      ])
    );
    if (!Buffer.from(mac).equals(Buffer.from(keyStore.crypto.mac, "hex"))) {
      throw new Error("Unmatched mac");
    }

    return Buffer.from(
      aesCtr.decrypt(Buffer.from(keyStore.crypto.ciphertext, "hex"))
    );
  }

  private static async scrpyt(
    text: string,
    params: ScryptParams
  ): Promise<Uint8Array> {
    const buf = Buffer.from(text);

    return await scrypt.scrypt(
      buf,
      Buffer.from(params.salt, "hex"),
      params.n,
      params.r,
      params.p,
      params.dklen
    );
  }
}
