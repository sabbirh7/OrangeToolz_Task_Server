const bcrypt = require('bcrypt');
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const createError = require("http-errors");
const csv = require('csv-parser');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ObjectsToCsv = require('objects-to-csv')

//Registration of o new user
async function addUser(req, res, next) {
  try {
     const { name, email, password } = req.body;
     const hashedPassword = await bcrypt.hash(password, 10);

     const newUser = {...req.body, password: hashedPassword}

     const toBeAddedUser = await prisma.users.create({
       data: newUser
   });
   res.json({ message: "User created successfully"});
   
  } catch (error) {
    next(error);
  }
}

//User login
async function userLogin(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await prisma.users.findFirst({
     where: { 
        email: username,
     }
    });

    if (user.email && user.status === 'active') {
      const isValidPassword = await bcrypt.compare(
        password,
        user.password
      );
      if (isValidPassword) {
        const userObject = {
          id: user.id,
          name: user.name,
          email: user.email,
        };
        res.status(200).json({
          role: 'user',
          user: userObject,
          message: "User Logged In successfully!",
        });
      } else {
        throw createError("Login failed! Please try again.");
      }
    } else {
      throw createError("Login failed! Please try again.");
    }
  } catch (err) {
    next(err);
  }
}


async function getAllUsers(req, res, next) {
  try {
    const Users = await prisma.users.findMany({});
    res.status(200).json(Users);
  } catch (error) {
     next(error);
  }
}


//Update User
async function updateUser(req, res, next){
  try {
        await prisma.users.update({
          where: {
              id: Number(req.params.id),
          },
          data: req.body
      });
      res.status(200).json({
        message: "User updated successfully!",
      });
      
  } catch (error) {
    res.status(500).json({
      message: "Couldn't update the user!"
    });         
  }

}

//Update User's Status
async function updateUserStatus(req, res, next){
  try {
      let status;

      if(req.params.status === 'active') {
        status = 'block';
      }
      else{
        status = 'active';
      }
      const updatedUser = await prisma.users.update({
          where: {
              id: Number(req.params.id),
          },
          data: {
            status: status
          }
      });
      res.status(200).json({
        message: "Status updated successfully!",
      });
  } catch (error) {
    res.status(500).json({
      message: "Couldn't update the status!"
    });       
  }

}

//delete User
async function deleteUser(req, res, next){
    try {
      console.log(req.params.id);
      await prisma.users.delete({
            where: {
                id: Number(req.params.id),
            },
        });
        res.status(200).json({
          message: "User deleted successfully!",
        });
        
    } catch (err) {
      res.status(500).json({
        message: "Couldn't delete the user!"
      });
    }     
  
}

// upload file and file info
async function uploadFile(req, res, next) {
  const { id, name, split } = req.body;
  const results = [];
  const groups = [];
  let subGroup = [];
  let newfile;
  if (req.files && req.files.length > 0) {

    fs.createReadStream(`${__dirname}/../public/uploads/files/${req.files[0].filename}`)
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        const totalUploadedFile = results.length;
        const output = 
        results.map(result => {
          let isnum = /^\d+$/.test(result.number) && result.number.length<=12;
          if(isnum === true){
            return result
          }
        })
        const totalProcessedFile = output.filter(function( element ) {
          return element !== undefined;
       });

       let count = 0;
       for(let i=0; i<totalProcessedFile.length; i++){
        subGroup.push(totalProcessedFile[i]);
        if((i+1) % Number(split) === 0){
          count = count + 1;
          
          const csvWriter = createCsvWriter({
            path: `${__dirname}/../public/uploads/files/${name}${count}.csv`,
            header: [
                {id: 'number', title: 'number'},
                {id: 'first name', title: 'first name'},
                {id: 'last name', title: 'last name'},
                {id: 'email', title: 'email'},
                {id: 'state', title: 'state'},
                {id: 'zip', title: 'zip'}
            ]
        });
        const records = subGroup;
    
        csvWriter.writeRecords(records)       // returns a promise
        .then(() => {
            console.log('csv File written successfully');
        });

            groups.push(subGroup);
            subGroup=[];
              }
          }
          
          if(subGroup.length !== 0 && subGroup.length < Number(split)){
              count = count+1;

              const csvWriter = createCsvWriter({
                path: `${__dirname}/../public/uploads/files/${name}${count}.csv`,
                header: [
                    {id: 'number', title: 'number'},
                    {id: 'first name', title: 'first name'},
                    {id: 'last name', title: 'last name'},
                    {id: 'email', title: 'email'},
                    {id: 'state', title: 'state'},
                    {id: 'zip', title: 'zip'}
                ]
            });
            const records = subGroup;
        
            csvWriter.writeRecords(records)       // returns a promise
            .then(() => {
                console.log('csv File written successfully');
            });

              groups.push(subGroup);

              // console.log(subGroup);
              //write chunk file
              //add to chunk table 
              //insert subGroup content into contact table
          }
          


      //  console.log(totalUploadedFile);
      //  console.log(totalProcessedFile.length);      
        
      });


  }
 



  // const newfile = {...req.body, file: req.files[0].filename }
  //save file or send error
    try {
      // const toBeAddedFile = await prisma.files.create({
      //   data: newfile
      // });

      // console.log(newfile);

      res.status(200).json({
        message: "File added successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: {
          common: {
            msg: err.message,
          },
        },
      });
    }
  }


module.exports = {
    addUser,
    userLogin,
    getAllUsers,
    updateUser,
    deleteUser,
    updateUserStatus,
    uploadFile,   
}