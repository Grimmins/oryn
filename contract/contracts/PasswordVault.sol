// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PasswordVault {
    struct VaultEntry {
        bytes encryptedBlobPassword;
        bytes encryptedBlobUsername;
        uint256 version;
        uint256 updatedAt;
    }

    // owner => siteHash => entry
    mapping(address => mapping(bytes32 => VaultEntry)) private _vaults;

    // owner => ordered list of siteHashes (for full vault retrieval)
    mapping(address => bytes32[]) private _siteHashes;

    // owner => siteHash => index+1 in _siteHashes (0 means absent)
mapping(address => mapping(bytes32 => uint256)) private _siteHashIndex;

    event PasswordSaved(address indexed owner, bytes32 indexed siteHash, uint256 version);

    function savePassword(bytes32 siteHash, bytes calldata blobPW, bytes calldata blobU) external {
        require(blobPW.length > 12, "password blob too short");
        require(blobU.length > 12, "username blob too short");

        VaultEntry storage entry = _vaults[msg.sender][siteHash];
        bool isNew = entry.updatedAt == 0;

        entry.encryptedBlobPassword = blobPW;
        entry.encryptedBlobUsername = blobU;
        entry.version = isNew ? 1 : entry.version + 1;
        entry.updatedAt = block.timestamp;

        if (isNew) {
            _siteHashes[msg.sender].push(siteHash);
            _siteHashIndex[msg.sender][siteHash] = _siteHashes[msg.sender].length;
        }

        emit PasswordSaved(msg.sender, siteHash, entry.version);
    }

    function getPassword(bytes32 siteHash)
        external
        view
        returns (
            bytes memory encryptedBlobPassword,
            bytes memory encryptedBlobUsername,
            uint256 version,
            uint256 updatedAt
        )
    {
        VaultEntry storage entry = _vaults[msg.sender][siteHash];
        return (entry.encryptedBlobPassword, entry.encryptedBlobUsername, entry.version, entry.updatedAt);
    }

}
