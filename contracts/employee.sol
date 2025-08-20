// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract EmployeeManagement {
    enum ROLES {CLEANER, MENTOR, STUDENT }
    enum STATUS {PROBATION, TERMINATED, STAFFED }

    struct Employee{
        string name;
        address user;
        uint256 age;
        uint256 salary;
        ROLES role;
        STATUS status;
    }
    address owner;
    constructor(address _owner){
        owner = _owner;
    }
    Employee[] employess;
    mapping(address => Employee) private employeeData;

    function createEmployee(string memory _name, address _user, uint _age, uint _salary, ROLES _role, STATUS _status) external {
        Employee memory employee = Employee({
            name: _name,
            user: _user,
            age: _age,
            salary: _salary,
            role: _role,
            status: _status
        });
        employess.push(employee);
        employeeData[_user] = employee;
    }

    function getAllEmployees() external view returns(Employee[] memory) {
        return employess;
    }

    function getByAddress(address _addr) external view returns (Employee memory) {
        return employeeData[_addr];
    }

    function paySalary(address _addr, uint _salary) external payable {
        require(owner == msg.sender, "not owner");
        require (employeeData[_addr].salary == _salary, "input correct salary");
        require(employeeData[_addr].status != STATUS.TERMINATED, "currently unemployed");

        payable(employeeData[_addr].user).transfer(_salary);
    }

    receive() external payable { }
    fallback() external payable { }
}