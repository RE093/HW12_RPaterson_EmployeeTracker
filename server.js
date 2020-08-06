const mysql = require("mysql");
const inquirer = require("inquirer");
const fs = require("fs");
const cTable = require("console.table")

require('dotenv').config();

let departments = [];
let roles = [];
let employees = [];
let employeeArr = [];

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 8000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DATABASE
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("connected as id " + connection.threadId);

  doWhat();
});

// What do you want to do? add, update, change etc
function doWhat() {

    connection.query("SELECT * FROM department", function(err, res) {
        if (err) throw err;
        departments = [];
        for (let i = 0; i < res.length; i++) {
            departments.push(res[i]);
        }
      })
    connection.query("SELECT * FROM role", function(err, res) {
        if (err) throw err;
        roles = [];
        for (let i = 0; i < res.length; i++) {
            roles.push(res[i]);
        }
    })
    connection.query("SELECT * FROM employee", function(err, res) {
        if (err) throw err;
        employees = [];
        for (let i = 0; i < res.length; i++) {
            employees.push(res[i]);
        }
    })
    
    inquirer.prompt ([
        {
            name: "doWhat",
            type: "list",
            message: "What would you like to do?",
            choices: [
                "Add departments, roles and employees",
                "View departments, roles and employees",
                "Update employee roles"
            ]
        }
    ]).then(function(data) {
        switch (data.doWhat) {
            case "Add departments, roles and employees":
                add();
                break;
            case "View departments, roles and employees":
                view();
                break;
            case "Update employee roles":
                update();
                break;
        }
    })
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

// Adding employees, roles, departments etc...
function add() {
    inquirer.prompt([
        {
            name: "addWhat",
            type: "list",
            message: "What would you like to add?",
            choices: [
                "add department",
                "add role",
                "add employee"
            ]
        }
    ]).then(function(data) {
        switch(data.addWhat) {
            case "add department":
                addDepartment()
                break;
            case "add role":
                addRole()
                break;
            case "add employee":
                addEmployee()
                break;
        }
    })
}

// add department
function addDepartment() {
    inquirer.prompt([
        {
            name: "department",
            type: "input",
            message: "Whats the department name?"
        }
    ]).then(function(data) {
        console.log("adding department");
        const query = connection.query(
            "INSERT INTO department SET ?",
            {
                name: data.department
            },
            function(err, res) {
                if (err) throw err;
                console.log(data.department + " department added!")
                doWhat();
            }
        )
    })
}

// add role
function addRole() {
    console.log("adding role")
    inquirer.prompt([
        {
            name: "role",
            type: "input",
            message: "Whats the role?"
        },
        {
            name: "salary",
            type: "input",
            message: "Whats the salary of the role?"
        },
        {
            name: "whatDepartment",
            type: "list",
            message: "What department does the role belong to?",
            choices: departments
        }
    ]).then(function(data) {

        let newID = "";

        for (i = 0; i < departments.length; i++) {
            if (data.whatDepartment === departments[i].name) {
                newID = departments[i].id;
            }
        }
        const query = connection.query(
            "INSERT INTO role SET ?",
            {
                title: data.role,
                salary: data.salary,
                department_id: newID
            },
            function(err, res) {
                if (err) throw err;
                console.log(data.role + " role added to the " + data.whatDepartment + " department!" )
                doWhat();
            }
        )
    })
}

function addEmployee() {
    
    let roleTitles = []; 
    employeeArr = ["No Manager"];
    new getEmployees("list");

    for (i = 0; i < roles.length; i++) {
        roleTitles.push(roles[i].title);
    }

    inquirer.prompt([
        {
            name: "firstName",
            type: "input",
            message: "Whats the employee's first name?"
        },
        {
            name: "lastName",
            type: "input",
            message: "Whats the employee's last name?"
        },
        {
            name: "roleName",
            type: "list",
            message: "Whats the employee's role?",
            choices: roleTitles
        },
        {
            name: "whoManager",
            type: "list",
            message: "who's the employees manager?",
            choices: employeeArr
        }
    ]).then(function(data){
        let roleID = "";

        for (i = 0; i < roles.length; i++) {
            if (data.roleName === roles[i].title) {
                roleID = roles[i].id;
            }
        }
        managerIs = employeeArr.indexOf(data.whoManager);

        if (managerIs === 0) {
            managerIs = null;
        }

        const query = connection.query(
            "INSERT INTO employee SET ?",
            {
                first_name: data.firstName,
                last_name: data.lastName,
                role_id: roleID,
                manager_id: managerIs
            },
            function(err, res) {
                if (err) throw err;
                console.log(data.firstName + " has been employed to do the " + data.roleName + " role!")
                doWhat();
            }
        )
    })
}

// ----------------------------------------------------------------------------------------------------------------------------------------------------

// View employees, roles, departments etc...
function view() {
    employeeArr = [];
    new getEmployees("list")
    inquirer.prompt([
        {
            name: "viewing",
            type: "list",
            message: "Do you want to view all employees or a specific employee?",
            choices: [
                "All",
                "Specific"
            ]
        }
    ]).then(function(data) {
        switch (data.viewing) {
            case "All":
                new getEmployees("all")
                break;
            case "Specific":
                inquirer.prompt([
                    {
                        name: "who",
                        type: "list",
                        message: "which employee do you want to view?",
                        choices: employeeArr
                    }
                ]).then(function(data) {
                    new getEmployees(data.who);
                })
                break;
        }
    })
}

// get all or specific employees and their associated data
class getEmployees {
    constructor(name) {
        connection.query(
        "SELECT e1.id,concat(e1.first_name, \" \" ,e1.last_name) AS Employee, role.title AS Title, department.name AS Department, role.salary AS Salary, concat(e2.first_name, \" \" ,e2.last_name) AS Manager FROM employee e1 LEFT JOIN role ON e1.role_id=role.id LEFT JOIN department ON department.id=role.department_id LEFT JOIN employee e2 ON e1.manager_id = e2.id ORDER BY ID", function(err, res) {
            if (err) throw err;
            for (let i = 0; i < res.length; i++) {
                if (res[i].Employee === name) {
                    console.log("\n")
                    console.table(res[i])
                    console.log("\n")
                    return doWhat();
                }
                if (name === "list") {
                    employeeArr.push(res[i].Employee)
                }
                if (name === "all") {
                    console.log("\n")
                    console.table(res);
                    console.log("\n")
                    return doWhat();
                }
            }
        })
    }
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

// update employees roles
function update() {

    let roleTitles = []; 
    let roleID = "";

    for (i = 0; i < roles.length; i++) {
        roleTitles.push(roles[i].title);
    }

    let selectedEmployee = "";
    new getEmployees("list");

    connection.query("SELECT * FROM employee", function(err, res) {
        inquirer.prompt([
            {
                name: "employerRole",
                type: "list",
                message: "Which employee do you want to update?",
                choices: employeeArr
            }
        ]).then(function(data) {

            selectedEmployee = data.employerRole;
            let isSplit = selectedEmployee.split(" ");

            inquirer.prompt([
                {
                    name: "newRole",
                    type: "list",
                    message: `which role is ${selectedEmployee} changing to?`,
                    choices: roleTitles
                }
            ]).then(function(data) {

                for (i = 0; i < roles.length; i++) {
                    if(data.newRole === roles[i].title) {
                        roleID = roles[i].id;
                    }
                }
                connection.query("SET SQL_SAFE_UPDATES = 0")

                let query = connection.query(
                    `UPDATE employee SET role_id="${roleID}" WHERE first_name="${isSplit[0]}" AND last_name="${isSplit[1]}"`,function(err, res) {
                    if (err) throw err;
                        console.log(`${selectedEmployee}  is now in the ${data.newRole} role!`);
                        console.log("\n")
                        return doWhat();
                    }
                );
            })
        })
    })
}