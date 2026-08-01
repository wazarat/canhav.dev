// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {VestingWalletCliffUpgradeable} from
    "@openzeppelin/contracts-upgradeable/finance/VestingWalletCliffUpgradeable.sol";

/// @title LaunchVestingWallet
/// @notice Cliff-capable vesting wallet deployed as an EIP-1167 clone by
///         TokenFactory alongside a token launch. Linear vesting between
///         `start` and `start + duration`, releasing nothing before
///         `start + cliff`. `cliffSeconds = 0` degrades to plain linear
///         vesting, so this single wrapper covers both cases.
/// @dev OZ's VestingWalletCliffUpgradeable is abstract (internal cliff init
///      only) — this wrapper adds the concrete 4-arg initializer. Note the OZ
///      property: the beneficiary IS the Ownable owner and can transfer
///      ownership (i.e. sell unvested tokens). Accepted and documented;
///      consumers must read `owner()` live rather than trusting the launch
///      event's beneficiary forever. `release(token)` is permissionless and
///      always pays the current owner.
contract LaunchVestingWallet is VestingWalletCliffUpgradeable {
    error DirectInitializeDisabled();

    /// @dev Lock the implementation contract so it can never be initialized directly.
    constructor() {
        _disableInitializers();
    }

    /// @param beneficiary Receives vested tokens; becomes the Ownable owner.
    /// @param startTimestamp Vesting start (unix seconds).
    /// @param durationSeconds Total vesting duration.
    /// @param cliffSeconds Nothing is releasable before start + cliffSeconds.
    ///        Must be <= durationSeconds (OZ InvalidCliffDuration otherwise).
    function initialize(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    ) external initializer {
        // Order matters: cliff init validates against duration().
        __VestingWallet_init(beneficiary, startTimestamp, durationSeconds);
        __VestingWalletCliff_init(cliffSeconds);
    }

    /// @dev The inherited cliff-less initializer must never run on clones —
    ///      the `initializer` race already prevents double-init, but an
    ///      explicit revert removes the cliff-bypassing path entirely.
    function initialize(address, uint64, uint64) public pure override {
        revert DirectInitializeDisabled();
    }
}
