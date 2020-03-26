import Wallbox from "./wallbox";
import { Socket } from "dgram";

describe("Wallbox", () => {
  const wallbox = new Wallbox("123434");
  it("Creates the instance", () => {
    expect(wallbox instanceof Wallbox).toBe(true);
  });
  it("Creates the socket", () => {
    expect(wallbox.socket instanceof Socket).toBe(true);
  });

  describe("Chargin session", () => {
    it("calcs the correct power", () => {
      console.log(wallbox.startChargingSession());
    });
  });
});
