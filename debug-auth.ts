import { auth } from "./lib/auth";

async function checkApi() {
  try {
    console.log("Auth API top-level keys:", Object.keys(auth.api).filter(k => !k.startsWith('_')));
    
    // Check if there is an 'organization' sub-object
    if ((auth.api as any).organization) {
      console.log("Organization sub-object found");
      console.log("Organization keys:", Object.keys((auth.api as any).organization).filter(k => !k.startsWith('_')));
    }

    // Check if there is an 'admin' sub-object
    if ((auth.api as any).admin) {
      console.log("Admin sub-object found");
      console.log("Admin keys:", Object.keys((auth.api as any).admin).filter(k => !k.startsWith('_')));
    }

    // Look for anything related to "ban"
    const allKeys = Object.keys(auth.api);
    if ((auth.api as any).organization) allKeys.push(...Object.keys((auth.api as any).organization));
    if ((auth.api as any).admin) allKeys.push(...Object.keys((auth.api as any).admin));

    const banKeys = allKeys.filter(k => k.toLowerCase().includes('ban'));
    console.log("Potential ban-related keys:", banKeys);

  } catch (error) {
    console.error("Error checking API:", error);
  }
}

checkApi();
