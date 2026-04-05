import { auth } from "./lib/auth";

async function checkApi() {
  try {
    console.log("Auth API top-level keys:", Object.keys(auth.api).filter(k => !k.startsWith('_')));
    
    // Check for plugins
    if ((auth.api as any).organization) {
      console.log("Organization plugin found");
      console.log("Organization keys:", Object.keys((auth.api as any).organization).filter(k => !k.startsWith('_')));
    } else {
      console.log("Organization plugin NOT found at auth.api.organization");
    }

    if ((auth.api as any).admin) {
      console.log("Admin plugin found");
      console.log("Admin keys:", Object.keys((auth.api as any).admin).filter(k => !k.startsWith('_')));
    } else {
      console.log("Admin plugin NOT found at auth.api.admin");
    }

    // Check if methods are merged directly
    const commonMethods = ['createUser', 'banMember', 'unbanMember', 'addMember', 'createOrganization'];
    commonMethods.forEach(method => {
      if ((auth.api as any)[method]) {
        console.log(`Method "${method}" found directly on auth.api`);
      }
    });

  } catch (error) {
    console.error("Error checking API:", error);
  }
}

checkApi();
