const User = require('./user');
const dbConnection = require('./db_connect');

module.exports = {
    usersMap: new Map(),
    to: 'User',

    init() {
        dbConnection.connect();
    },

    getUser(userName) {
        return this.usersMap.get(userName);
    },

    receivePackage(ws, data) {
        const pkg = JSON.parse(data);
        switch (pkg.type) {
            case 'RegisterPackage':
                {
                    const RegisterPackage = {
                        type: pkg.type,
                        message: {
                            serverName: this.to,
                            pkgNames: ['Login', 'Logout'],
                        },
                    };
                    this.sendResponse(ws, RegisterPackage);
                }
                break;
            case 'Login':
                {
                    const userName = pkg.message.userName;
                    if (this.usersMap.has(userName)) {
                        const user = this.usersMap.get(userName);
                        const Login = {
                            type: pkg.type,
                            from: this.to,
                            to: pkg.from,
                            message: user,
                            clientID: pkg.clientID,
                        };

                        this.sendResponse(ws, Login);
                    }
                    else {
                        let user = new User();
                        dbConnection.query(`select * from User where userName = "${userName}"`, (results) => {
                            if (results.length === 1) {
                                user = JSON.parse(JSON.stringify(results[0]));
                                this.usersMap.set(userName, user);
                                const Login = {
                                    type: pkg.type,
                                    from: this.to,
                                    to: pkg.from,
                                    message: user,
                                    clientID: pkg.clientID,
                                };
                                this.sendResponse(ws, Login);
                            }
                            else if (results.length === 0) {
                                const addUserToSql = `insert into User (userName, userPoint) values ('${userName}', ${user.userPoint})`;
                                dbConnection.query(addUserToSql, (insertResults) => {
                                    const insertObj = JSON.parse(JSON.stringify(insertResults));
                                    console.log(JSON.stringify(insertResults));
                                    console.log(insertObj.insertId);
                                    user.userID = insertObj.insertId;
                                    this.usersMap.set(userName, user);
                                    const Login = {
                                        type: pkg.type,
                                        from: this.to,
                                        to: pkg.from,
                                        message: user,
                                        clientID: pkg.clientID,
                                    };
                                    this.sendResponse(ws, Login);
                                });
                            }
                        });
                    }
                }
                break;
            case 'Logout':
                {
                    const user = pkg.message;
                    const updateUserToSql = `UPDATE User SET userPoint = ${user.userPoint} WHERE userID = ${user.userID}`;
                    console.log(`updateUserToSql: ${updateUserToSql}`);
                    dbConnection.query(updateUserToSql, () => {});
                    const Logout = {
                        type: pkg.type,
                        from: this.to,
                        to: pkg.from,
                        message: user,
                        clientID: pkg.clientID,
                    };
                    this.sendResponse(ws, Logout);
                }
                break;
            default:
                break;
        }
    },

    sendResponse(ws, data) {
        console.log(`server send data: ${JSON.stringify(data)}`);
        ws.send(JSON.stringify(data));
    },
};
