// ═══════════════════════════════════════════════════════════
// EVM Claim Contract — Merkle-based token claims
// Deploy one per campaign per EVM chain
// ═══════════════════════════════════════════════════════════

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ClaimContract is Pausable, Ownable {
    IERC20 public immutable token;
    bytes32 public immutable merkleRoot;
    uint256 public immutable claimDeadline;

    // Track claimed wallets — one claim per address
    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed user, uint256 amount, bytes32 indexed campaignId);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    constructor(
        address _token,
        bytes32 _merkleRoot,
        uint256 _claimDeadline
    ) Ownable() {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        claimDeadline = _claimDeadline;
    }

    // ── Claim tokens ──
    function claim(
        uint256 amount,
        bytes32[] calldata merkleProof,
        bytes32 campaignId
    ) external whenNotPaused {
        // Deadline check
        require(block.timestamp <= claimDeadline, "Claim period ended");

        // One claim per wallet
        require(!hasClaimed[msg.sender], "Already claimed");
        hasClaimed[msg.sender] = true;

        // Merkle proof verification
        bytes32 leaf = keccak256(
            abi.encodePacked(msg.sender, amount)
        );
        require(
            MerkleProof.verify(merkleProof, merkleRoot, leaf),
            "Invalid proof"
        );

        // Transfer tokens
        require(
            token.transfer(msg.sender, amount),
            "Transfer failed"
        );

        emit Claimed(msg.sender, amount, campaignId);
    }

    // ── Admin: pause ──
    function pause() external onlyOwner {
        _pause();
    }

    // ── Admin: unpause ──
    function unpause() external onlyOwner {
        _unpause();
    }

    // ── Admin: emergency withdraw remaining tokens ──
    function emergencyWithdraw(address to) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(to, balance), "Withdraw failed");
        emit EmergencyWithdraw(to, balance);
    }
}
