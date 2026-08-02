// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title JourneyUpdates
/// @notice On-chain anchor for milestone progress updates. The update body
///         lives off-chain (content-addressed, same pattern as journey docs);
///         only its keccak256 hash is committed here, so an update can never
///         be quietly rewritten after posting.
/// @dev Permissionless by design — anyone can emit for any token. Authorship
///      is enforced at the display layer: consumers only surface updates
///      whose `author` equals the token's creator from its TokenLaunched
///      event. A singleton with no state and no admin.
contract JourneyUpdates {
    /// @notice Milestone indexes are bounded by the journey doc's 5-milestone cap.
    uint8 public constant MAX_MILESTONE_INDEX = 4;

    event MilestoneUpdate(
        address indexed token,
        address indexed author,
        uint8 milestoneIndex,
        bytes32 updateHash
    );

    error ZeroToken();
    error ZeroUpdateHash();
    error MilestoneIndexTooHigh(uint8 milestoneIndex);

    function postUpdate(address token, uint8 milestoneIndex, bytes32 updateHash) external {
        if (token == address(0)) revert ZeroToken();
        if (updateHash == bytes32(0)) revert ZeroUpdateHash();
        if (milestoneIndex > MAX_MILESTONE_INDEX) revert MilestoneIndexTooHigh(milestoneIndex);
        emit MilestoneUpdate(token, msg.sender, milestoneIndex, updateHash);
    }
}
