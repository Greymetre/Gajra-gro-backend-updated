var axios = require('axios');
export const SendOTPMessage = async (message: any) => {
    return await new Promise(async (resolve, reject) => {
        const headers = {
            'Content-Type': 'application/json',
        };
        const data = {
            campaign_name: process.env.APPMSG_CAMPAIGNNAME,
            auth_key: process.env.APPMSG_AUTHKEY,
            receivers: message.mobile,
            sender: process.env.APPMSG_SENDER,
            route: 'TR',
            message: {
                msgdata: `Gajra Gro + Loyalty - OTP to verify your login is ${message.otp} from -GAJRA GEARS PRIVATE LIMITED`,
                Template_ID: process.env.APPMSG_TEMPLATEID,
                coding: '',
                flash_message: 1,
                scheduleTime: '',
            },
        };
        await axios.post(process.env.APPMSG_APIURL, data, { headers }).then((response) => {
            const { data } = response
            if (data.status === 'Success') {
                resolve(data)
            }
            else {
                reject(response)
            }
        })
            .catch((error) => {
                reject(error)
            });
    })
}
// export const SendOTPMessage = async (message: any) => {
//     const url = 'http://sms.bulksmsserviceproviders.com/api/send/sms';
//     const headers = {
//         'Content-Type': 'application/json',
//     };
//     const data = {
//         campaign_name: 'Gajra Gro',
//         auth_key: 'e64851a61344571305b59a5202caed0a',
//         receivers: message.mobile,
//         sender: 'GJRGRO',
//         route: 'TR',
//         message: {
//             msgdata: `Gajra Gro + Loyalty - OTP to verify your login is ${message.otp} from -GAJRA GEARS PRIVATE LIMITED`,
//             Template_ID: '1107167904020762910',
//             coding: '',
//             flash_message: 1,
//             scheduleTime: '',
//         },
//     };
//     try {
//         const response = await axios.post(url, data, { headers });
//         return response
//     } catch (error) {
//         console.error(error);
//     }
// }

export const SendCustomerToSaleCrm = (data: any) => {
    axios.get('https://gajragears.fieldkonnect.io/api/getStateList', data)
        .then((response) => {
            console.log('res', response);
        })
        .catch((error) => {
            console.log('erro', error);
        });
}

export const getCustomerFromSaleCrm = () => {
    const promise = new Promise((resolve, reject) => {
        axios.get('https://gajragears.fieldkonnect.io/api/signupFromGajraMlp')
            .then((response) => {
                resolve(response.data)
            })
            .catch((error) => {
                reject(error)
            });
    })
}