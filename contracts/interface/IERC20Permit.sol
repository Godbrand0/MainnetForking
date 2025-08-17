// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

interface IERC20Permit {
    function approve(address _spender, uint _value) external;

    function balanceOf(address who) external view returns (uint256 balance);
    function transferFrom(
        address  sender,
        address recipient,
        uint amount
    )external returns(bool);

    function permit(
        address owner,
        address spender,
        uint value,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}