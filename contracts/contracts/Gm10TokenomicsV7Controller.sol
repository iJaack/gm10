// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFundAccessControl {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

contract Gm10TokenomicsV7Controller {
    uint8 public constant SEGMENT_COUNT = 5;
    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;

    address public immutable fund;
    address[5] private segmentRecipients;
    mapping(address => bool) private profitShareExclusions;
    address[] private profitShareExcludedAccounts;
    mapping(address => uint256) private profitShareExcludedIndexPlusOne;
    bool private initialized;

    event SegmentRecipientSet(uint8 indexed segment, address indexed recipient);
    event ProfitShareExclusionSet(address indexed account, bool excluded);

    error AlreadyInitialized();
    error InvalidSegment();
    error OnlyFund();
    error Unauthorized();
    error ZeroAddress();

    constructor(
        address _fund,
        address _coreTeam,
        address _governanceTreasury,
        address _communityEcosystem,
        address _advisors,
        address _strategicPartnerships
    ) {
        if (_fund == address(0)) revert ZeroAddress();
        fund = _fund;
        initialized = true;

        _setSegmentRecipient(0, _coreTeam);
        _setSegmentRecipient(1, _governanceTreasury);
        _setSegmentRecipient(2, _communityEcosystem);
        _setSegmentRecipient(3, _advisors);
        _setSegmentRecipient(4, _strategicPartnerships);
    }

    modifier onlyFund() {
        if (msg.sender != fund) revert OnlyFund();
        _;
    }

    modifier onlyFundAdmin() {
        if (!IFundAccessControl(fund).hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert Unauthorized();
        _;
    }

    function initializeSegments(
        address _coreTeam,
        address _governanceTreasury,
        address _communityEcosystem,
        address _advisors,
        address _strategicPartnerships
    ) external onlyFund {
        if (initialized) revert AlreadyInitialized();
        initialized = true;

        _setSegmentRecipient(0, _coreTeam);
        _setSegmentRecipient(1, _governanceTreasury);
        _setSegmentRecipient(2, _communityEcosystem);
        _setSegmentRecipient(3, _advisors);
        _setSegmentRecipient(4, _strategicPartnerships);
    }

    function setSegmentRecipient(uint8 _segment, address _recipient) external onlyFundAdmin {
        _setSegmentRecipient(_segment, _recipient);
    }

    function segmentRecipient(uint8 _segment) external view returns (address) {
        if (_segment >= SEGMENT_COUNT) revert InvalidSegment();
        return segmentRecipients[_segment];
    }

    function setProfitShareExclusion(address _account, bool _excluded) external onlyFundAdmin {
        _setProfitShareExclusion(_account, _excluded);
    }

    function excludedFromProfitShare(address _account) external view returns (bool) {
        return profitShareExclusions[_account];
    }

    function profitEligibleSupply18() external view returns (uint256) {
        IERC20 token = IERC20(fund);
        uint256 excludedSupply;
        uint256 excludedCount = profitShareExcludedAccounts.length;
        for (uint256 i = 0; i < excludedCount; ++i) {
            address account = profitShareExcludedAccounts[i];
            if (profitShareExclusions[account]) {
                excludedSupply += token.balanceOf(account);
            }
        }

        uint256 supply = token.totalSupply();
        return excludedSupply >= supply ? 0 : supply - excludedSupply;
    }

    function _setSegmentRecipient(uint8 _segment, address _recipient) internal {
        if (_segment >= SEGMENT_COUNT) revert InvalidSegment();
        if (_recipient == address(0)) revert ZeroAddress();

        segmentRecipients[_segment] = _recipient;
        _setProfitShareExclusion(_recipient, true);
        emit SegmentRecipientSet(_segment, _recipient);
    }

    function _setProfitShareExclusion(address _account, bool _excluded) internal {
        if (_account == address(0)) revert ZeroAddress();
        if (profitShareExclusions[_account] == _excluded) return;

        profitShareExclusions[_account] = _excluded;

        if (_excluded && profitShareExcludedIndexPlusOne[_account] == 0) {
            profitShareExcludedIndexPlusOne[_account] = profitShareExcludedAccounts.length + 1;
            profitShareExcludedAccounts.push(_account);
        }

        emit ProfitShareExclusionSet(_account, _excluded);
    }
}
