// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20{
    constructor(uint amount, address to)ERC20 ("token","TOK"){
        _mint(to, amount);
    }
    
}