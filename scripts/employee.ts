import hre from "hardhat";

async function employee() {

    const [owner]= await hre.ethers.getSigners();
  const employeeDeployed = await hre.ethers.getContractFactory(
    "EmployeeManagement"
  );

  const deployedEmployee = await employeeDeployed.deploy(owner.address);
  const deployedAddress = await deployedEmployee.waitForDeployment();
  
  console.log(
    "employee management contract deployed at:",
    deployedAddress.target
  );
}

employee().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
