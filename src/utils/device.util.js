import crypto from "crypto";

/**
 * Generate device ID dari user agent dan IP address
 * Device ID digunakan untuk constraint 1 session per user per device
 * @param {string} userAgent - User agent string dari request
 * @param {string} ipAddress - IP address dari request
 * @returns {string} - Device ID (hashed)
 */
const generateDeviceId = (userAgent, ipAddress) => {
  const deviceString = `${userAgent || "unknown"}-${ipAddress || "unknown"}`;
  return crypto.createHash("sha256").update(deviceString).digest("hex");
};

/**
 * Parse device name dari user agent
 * @param {string} userAgent - User agent string
 * @returns {string} - Device name
 */
const parseDeviceName = (userAgent) => {
  if (!userAgent) return "Unknown Device";

  let browser = "Unknown Browser";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";
  else if (userAgent.includes("Opera")) browser = "Opera";

  let os = "Unknown OS";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone"))
    os = "iOS";

  return `${browser} on ${os}`;
};

/**
 * Extract IP address dari request
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
const extractIpAddress = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

export default {
  extractIpAddress,
  generateDeviceId,
  parseDeviceName,
};
