// Firebase web config for the shared come-back-fitz21 project (Come back, One Line a Day, Little Bites,
// Recipe Book and Brain Dump live there too). These values aren't secrets; firestore.rules is the lock.
// Set `firebase: null` to keep everything on this device.
export const config = {
  firebase: {
    apiKey: 'AIzaSyAv_YXHEGQ4Pl540ph7pnoG-XMgOjiJUDg',
    authDomain: 'come-back-fitz21.firebaseapp.com',
    projectId: 'come-back-fitz21',
    appId: '1:819440729074:web:c260c4044e28fe277f896b',
  },
  // The journal pages and this app's own notes are locked to this account by the shared rules.
  ownerEmail: 'fitzgeraldryan21@gmail.com',
};
