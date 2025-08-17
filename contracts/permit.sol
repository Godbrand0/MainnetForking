// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./interface/IERC20Permit.sol";

contract Vault{
    IERC20Permit public immutable token;

    constructor(address _token){
        token = IERC20Permit(_token);
    }
    function deposit(uint amount) external{
        token.transferFrom(msg.sender, address(this), amount);
    }

    function depositWithPermit(uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s)external{
        token.permit(msg.sender, address(this), amount, deadline, v, r, s);
        token.transferFrom(msg.sender, address(this), amount);
    }
}