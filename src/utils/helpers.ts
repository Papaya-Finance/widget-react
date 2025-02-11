import { constants, ethers } from "ethers";

export enum NonceType {
  Account, // Nonce for account
  Selector, // Nonce for selector
  Unique, // Nonce for unique
  Invalid, // Invalid Type
}

/**
 * Builds traits for {bySig} contract by combining params.
 * @param params An object containing the following properties:
 * - `nonceType` The type of nonce to use. Default is `NonceType.Account`.
 * - `deadline` The deadline for the message. Default is `0`.
 * - `relayer` The relayer address. Default is the zero address.
 * - `nonce` The nonce. Default is `0`.
 * @returns A bigint representing the combined traits.
 * @throws Error if provided with invalid parameters.
 */
export function buildBySigTraits({
  nonceType = NonceType.Account,
  deadline = 0,
  relayer = constants.AddressZero.toString(),
  nonce = 0,
} = {}): bigint {
  if (nonceType > 3) {
    throw new Error("Wrong nonce type, it should be less than 4");
  }
  if (deadline > 0xffffffffff) {
    throw new Error("Wrong deadline, it should be less than 0xffffffff");
  }
  if (relayer.length > 42) {
    throw new Error("Wrong relayer address, it should be less than 42 symbols");
  }
  if (nonce > 0xffffffffffffffffffffffffffffffffn) {
    throw new Error("Wrong nonce, it should not be more than 128 bits");
  }

  return (
    (BigInt(nonceType) << 254n) +
    (BigInt(deadline) << 208n) +
    ((BigInt(relayer) & 0xffffffffffffffffffffn) << 128n) +
    BigInt(nonce)
  );
}

/**
 * Define a default deadline constant.
 * (Adjust this value as needed for your application.)
 */
export const defaultDeadline = 0; // For example, 0 or any default value

/**
 * Removes the function selector (the first 4 bytes) from encoded function data.
 *
 * @param data - The full hex-encoded function data.
 * @returns The data without the first 4 bytes (i.e. without the function selector).
 */
export function cutSelector(data: string): string {
  const hexPrefix = "0x";
  return hexPrefix + data.substring(hexPrefix.length + 8);
}

export function buildDataForUSDC(
  name: string,
  tokenVersion: string,
  chainId: number,
  verifyingContract: string,
  owner: string,
  spender: string,
  value: string,
  nonce: string,
  deadline: string
) {
  return {
    domain: {
      name, // token name (e.g. "USD Coin")
      version: tokenVersion, // e.g. "1"
      chainId,
      verifyingContract,
    },
    types: {
      // Standard EIP‑2612 permit
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    message: {
      owner,
      spender,
      value,
      nonce,
      deadline,
    },
  };
}

/**
 * Builds the EIP‑712 data for USDT (non‑standard permit).
 *
 * USDT’s permit expects:
 *   permit(holder, spender, nonce, expiry, allowed, v, r, s)
 * Here, we build a message with:
 *   - holder: owner's address
 *   - spender: spender’s address
 *   - nonce: current nonce
 *   - expiry: deadline (used as expiry)
 *   - allowed: a boolean (set to true)
 */
export function buildDataForUSDT(
  name: string,
  tokenVersion: string,
  chainId: number,
  verifyingContract: string,
  holder: string,
  spender: string,
  nonce: string,
  expiry: string,
  allowed: boolean
) {
  return {
    domain: {
      name,
      version: tokenVersion,
      chainId,
      verifyingContract,
    },
    types: {
      // USDT permit schema
      Permit: [
        { name: "holder", type: "address" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "allowed", type: "bool" },
      ],
    },
    message: {
      holder,
      spender,
      nonce,
      expiry,
      allowed,
    },
  };
}

/**
 * @category permit
 * Compresses a permit function call to a shorter format based on its type.
 *
 *   Type         | EIP-2612 | DAI      | Permit2
 *   Uncompressed |   ~224   | ~256     | ~352
 *   Compressed   |   ~100   | ~72      | ~96
 *
 * @param permit - The full permit function call string.
 * @return A compressed permit string.
 */
export function compressPermit(permit: string): string {
  const abiCoder = ethers.utils.defaultAbiCoder;
  switch (permit.length) {
    case 450: {
      // IERC20Permit.permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s)
      const args = abiCoder.decode(
        [
          "address owner",
          "address spender",
          "uint256 value",
          "uint256 deadline",
          "uint8 v",
          "bytes32 r",
          "bytes32 s",
        ],
        permit
      );
      // Compact format: IERC20Permit.permit(uint256 value, uint32 deadline, uint256 r, uint256 vs)
      return (
        "0x" +
        args.value.toString(16).padStart(64, "0") +
        (args.deadline.toString() === ethers.constants.MaxUint256.toString()
          ? "00000000"
          : (args.deadline + 1n).toString(16).padStart(8, "0")) +
        BigInt(args.r).toString(16).padStart(64, "0") +
        (((args.v - 27n) << 255n) | BigInt(args.s))
          .toString(16)
          .padStart(64, "0")
      );
    }
    case 514: {
      // IDaiLikePermit.permit(address holder, address spender, uint256 nonce, uint256 expiry, bool allowed, uint8 v, bytes32 r, bytes32 s)
      const args = abiCoder.decode(
        [
          "address holder",
          "address spender",
          "uint256 nonce",
          "uint256 expiry",
          "bool allowed",
          "uint8 v",
          "bytes32 r",
          "bytes32 s",
        ],
        permit
      );
      // Compact format: IDaiLikePermit.permit(uint32 nonce, uint32 expiry, uint256 r, uint256 vs)
      return (
        "0x" +
        args.nonce.toString(16).padStart(8, "0") +
        (args.expiry.toString() === ethers.constants.MaxUint256.toString()
          ? "00000000"
          : (args.expiry + 1n).toString(16).padStart(8, "0")) +
        BigInt(args.r).toString(16).padStart(64, "0") +
        (((args.v - 27n) << 255n) | BigInt(args.s))
          .toString(16)
          .padStart(64, "0")
      );
    }
    case 706: {
      // IPermit2.permit(address owner, PermitSingle calldata permitSingle, bytes calldata signature)
      const args = abiCoder.decode(
        [
          "address owner",
          "address token",
          "uint160 amount",
          "uint48 expiration",
          "uint48 nonce",
          "address spender",
          "uint256 sigDeadline",
          "bytes signature",
        ],
        permit
      );
      // Compact format: IPermit2.permit(uint160 amount, uint32 expiration, uint32 nonce, uint32 sigDeadline, uint256 r, uint256 vs)
      return (
        "0x" +
        args.amount.toString(16).padStart(40, "0") +
        (args.expiration.toString() === BigInt("0xffffffffffff").toString()
          ? "00000000"
          : (args.expiration + 1n).toString(16).padStart(8, "0")) +
        args.nonce.toString(16).padStart(8, "0") +
        (args.sigDeadline.toString() === BigInt("0xffffffffffff").toString()
          ? "00000000"
          : (args.sigDeadline + 1n).toString(16).padStart(8, "0")) +
        BigInt(args.signature).toString(16).padStart(128, "0")
      );
    }
    case 202:
    case 146:
    case 194:
      throw new Error("Permit is already compressed");
    default:
      throw new Error("Invalid permit length");
  }
}

/**
 * @category permit
 * Decompresses a compressed permit function call back to its original full format.
 *
 * @param permit - The compressed permit function call string.
 * @param token - The token address involved in the permit (used for Permit2 type).
 * @param owner - The owner address involved in the permit.
 * @param spender - The spender address involved in the permit.
 * @return The decompressed permit function call string.
 */
export function decompressPermit(
  permit: string,
  token: string,
  owner: string,
  spender: string
): string {
  const abiCoder = ethers.utils.defaultAbiCoder;

  // Helper to remove "0x" prefix from a hex string.
  function trim0x(hex: string): string {
    return hex.startsWith("0x") ? hex.slice(2) : hex;
  }

  switch (permit.length) {
    case 202: {
      // Compact IERC20Permit.permit(uint256 value, uint32 deadline, uint256 r, uint256 vs)
      const args = {
        value: BigInt(permit.slice(0, 66)),
        deadline: BigInt("0x" + permit.slice(66, 74)),
        r: "0x" + permit.slice(74, 138),
        vs: BigInt("0x" + permit.slice(138, 202)),
      };
      // Rebuild full IERC20Permit.permit(...) call.
      return abiCoder.encode(
        [
          "address owner",
          "address spender",
          "uint256 value",
          "uint256 deadline",
          "uint8 v",
          "bytes32 r",
          "bytes32 s",
        ],
        [
          owner,
          spender,
          args.value,
          args.deadline === 0n
            ? ethers.constants.MaxUint256
            : args.deadline - 1n,
          (args.vs >> 255n) + 27n,
          args.r,
          "0x" +
            (
              args.vs &
              BigInt(
                "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
              )
            )
              .toString(16)
              .padStart(64, "0"),
        ]
      );
    }
    case 146: {
      // Compact IDaiLikePermit.permit(uint32 nonce, uint32 expiry, uint256 r, uint256 vs)
      const args = {
        nonce: BigInt(permit.slice(0, 10)),
        expiry: BigInt("0x" + permit.slice(10, 18)),
        r: "0x" + permit.slice(18, 82),
        vs: BigInt("0x" + permit.slice(82, 146)),
      };
      return abiCoder.encode(
        [
          "address holder",
          "address spender",
          "uint256 nonce",
          "uint256 expiry",
          "bool allowed",
          "uint8 v",
          "bytes32 r",
          "bytes32 s",
        ],
        [
          owner,
          spender,
          args.nonce,
          args.expiry === 0n ? ethers.constants.MaxUint256 : args.expiry - 1n,
          true,
          (args.vs >> 255n) + 27n,
          args.r,
          "0x" +
            (
              args.vs &
              BigInt(
                "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
              )
            )
              .toString(16)
              .padStart(64, "0"),
        ]
      );
    }
    case 194: {
      // Compact IPermit2.permit(uint160 amount, uint32 expiration, uint32 nonce, uint32 sigDeadline, uint256 r, uint256 vs)
      const args = {
        amount: BigInt(permit.slice(0, 42)),
        expiration: BigInt("0x" + permit.slice(42, 50)),
        nonce: BigInt("0x" + permit.slice(50, 58)),
        sigDeadline: BigInt("0x" + permit.slice(58, 66)),
        r: "0x" + permit.slice(66, 130),
        vs: "0x" + permit.slice(130, 194),
      };
      return abiCoder.encode(
        [
          "address owner",
          "address token",
          "uint160 amount",
          "uint48 expiration",
          "uint48 nonce",
          "address spender",
          "uint256 sigDeadline",
          "bytes signature",
        ],
        [
          owner,
          token,
          args.amount,
          args.expiration === 0n
            ? BigInt("0xffffffffffff")
            : args.expiration - 1n,
          args.nonce,
          spender,
          args.sigDeadline === 0n
            ? BigInt("0xffffffffffff")
            : args.sigDeadline - 1n,
          args.r + trim0x(args.vs),
        ]
      );
    }
    case 450:
    case 514:
    case 706:
      throw new Error("Permit is already decompressed");
    default:
      throw new Error("Invalid permit length");
  }
}
