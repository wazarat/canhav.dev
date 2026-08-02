// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title FeeSplitter
/// @notice The platform's share of AMM protocol fees lands here — a contract,
///         never an EOA — and leaves only through `distribute*`, which pays
///         the configured payees pro-rata and emits one event per transfer:
///         every distribution is auditable from the log alone.
/// @dev Owned by the TimelockController, so any payee change waits out the
///      public delay. Distribution itself is permissionless.
contract FeeSplitter is Ownable2Step {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    address[] private _payees;
    uint16[] private _sharesBps;

    event PayeesSet(address[] payees, uint16[] sharesBps);
    event Distributed(address indexed asset, address indexed payee, uint256 amount);

    error LengthMismatch();
    error NoPayees();
    error ZeroPayee();
    error BpsSumInvalid(uint256 sum);
    error NothingToDistribute();
    error EthTransferFailed();

    constructor(address initialOwner, address[] memory payees_, uint16[] memory sharesBps_)
        Ownable(initialOwner)
    {
        _setPayees(payees_, sharesBps_);
    }

    receive() external payable {}

    function payees() external view returns (address[] memory, uint16[] memory) {
        return (_payees, _sharesBps);
    }

    /// @notice Replace the payee set. Owner-only — i.e. behind the timelock's
    ///         public delay.
    function setPayees(address[] calldata payees_, uint16[] calldata sharesBps_)
        external
        onlyOwner
    {
        _setPayees(payees_, sharesBps_);
    }

    /// @notice Push the current ETH balance to the payees. Anyone may call.
    ///         The last payee receives the remainder, so no wei strands.
    function distributeEth() external {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToDistribute();
        uint256 remaining = balance;
        uint256 n = _payees.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 amount = i == n - 1 ? remaining : (balance * _sharesBps[i]) / BPS;
            remaining -= amount;
            (bool ok,) = _payees[i].call{value: amount}("");
            if (!ok) revert EthTransferFailed();
            emit Distributed(address(0), _payees[i], amount);
        }
    }

    /// @notice Push the current balance of `token` to the payees.
    function distributeToken(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert NothingToDistribute();
        uint256 remaining = balance;
        uint256 n = _payees.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 amount = i == n - 1 ? remaining : (balance * _sharesBps[i]) / BPS;
            remaining -= amount;
            IERC20(token).safeTransfer(_payees[i], amount);
            emit Distributed(token, _payees[i], amount);
        }
    }

    function _setPayees(address[] memory payees_, uint16[] memory sharesBps_) private {
        if (payees_.length == 0) revert NoPayees();
        if (payees_.length != sharesBps_.length) revert LengthMismatch();
        uint256 sum;
        for (uint256 i = 0; i < payees_.length; i++) {
            if (payees_[i] == address(0)) revert ZeroPayee();
            sum += sharesBps_[i];
        }
        if (sum != BPS) revert BpsSumInvalid(sum);
        _payees = payees_;
        _sharesBps = sharesBps_;
        emit PayeesSet(payees_, sharesBps_);
    }
}
