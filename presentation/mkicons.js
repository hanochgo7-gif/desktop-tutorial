const React = require("react"), RDS = require("react-dom/server"), sharp = require("sharp"), Fa = require("react-icons/fa");
const list = { grad: Fa.FaGraduationCap, tool: Fa.FaTools, users: Fa.FaUsers, bolt: Fa.FaBolt, star: Fa.FaStar, growth: Fa.FaChartLine, warn: Fa.FaExclamationTriangle, home: Fa.FaHome, heart: Fa.FaUserFriends, pulse: Fa.FaHeartbeat, clock: Fa.FaClock };
(async () => { for (const [k, C] of Object.entries(list)) {
  const svg = RDS.renderToStaticMarkup(React.createElement(C, { color: "#0E1116", size: 256 }));
  await sharp(Buffer.from(svg)).png().toFile("icons/" + k + ".png"); }
  console.log("icons", Object.keys(list).length); })();
