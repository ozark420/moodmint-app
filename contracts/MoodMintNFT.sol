// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MoodMintNFT
 * @dev Daily PFP minting for AI agents on Base
 * @notice Each agent can mint one PFP per 24-hour period
 */
contract MoodMintNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    ERC2981, 
    Ownable, 
    ReentrancyGuard 
{
    uint256 private _nextTokenId;
    uint256 public constant MINT_COOLDOWN = 24 hours;
    
    // Mapping from agent address to last mint timestamp
    mapping(address => uint256) public lastMintTime;
    
    // Mapping from token ID to mint timestamp (for historical queries)
    mapping(uint256 => uint256) public mintTimestamps;
    
    // Mapping from agent to their token IDs (for timeline feature)
    mapping(address => uint256[]) public agentTokens;
    
    // Relayer address for gasless mints
    address public relayer;
    
    // Events
    event DailyMint(
        address indexed agent, 
        uint256 indexed tokenId, 
        string metadataUri,
        uint256 timestamp
    );
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    constructor(
        address initialOwner,
        address _relayer
    ) ERC721("MoodMint", "MOOD") Ownable(initialOwner) {
        relayer = _relayer;
        // Set default royalty to 2.5%
        _setDefaultRoyalty(initialOwner, 250);
    }

    /**
     * @dev Modifier to check if enough time has passed since last mint
     */
    modifier canMint(address agent) {
        require(
            block.timestamp >= lastMintTime[agent] + MINT_COOLDOWN,
            "MoodMint: Must wait 24 hours between mints"
        );
        _;
    }

    /**
     * @dev Mint a new daily PFP NFT
     * @param to The agent address receiving the NFT
     * @param metadataUri IPFS URI for the NFT metadata
     */
    function mintDaily(
        address to, 
        string memory metadataUri
    ) external nonReentrant canMint(to) returns (uint256) {
        // Only allow self-mint or relayer-assisted mint
        require(
            msg.sender == to || msg.sender == relayer,
            "MoodMint: Unauthorized minter"
        );

        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataUri);
        
        lastMintTime[to] = block.timestamp;
        mintTimestamps[tokenId] = block.timestamp;
        agentTokens[to].push(tokenId);

        emit DailyMint(to, tokenId, metadataUri, block.timestamp);
        
        return tokenId;
    }

    /**
     * @dev Get time remaining until agent can mint again
     */
    function timeUntilNextMint(address agent) external view returns (uint256) {
        if (lastMintTime[agent] == 0) return 0;
        
        uint256 nextMintTime = lastMintTime[agent] + MINT_COOLDOWN;
        if (block.timestamp >= nextMintTime) return 0;
        
        return nextMintTime - block.timestamp;
    }

    /**
     * @dev Get all token IDs owned by an agent (for timeline)
     */
    function getAgentTimeline(address agent) external view returns (uint256[] memory) {
        return agentTokens[agent];
    }

    /**
     * @dev Get the total number of mints by an agent
     */
    function getAgentMintCount(address agent) external view returns (uint256) {
        return agentTokens[agent].length;
    }

    /**
     * @dev Update the relayer address (owner only)
     */
    function setRelayer(address newRelayer) external onlyOwner {
        address oldRelayer = relayer;
        relayer = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }

    /**
     * @dev Update default royalty (owner only)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // Required overrides for multiple inheritance
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
