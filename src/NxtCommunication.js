/**
 * Communication interface for interacting with NXT
 */
class NxtCommunication {
  async connect() {
    throw new Error("Not implemented");
  }

  async sendCommand(command) {
    throw new Error("Not implemented");
  }

  async receiveData() {
    throw new Error("Not implemented");
  }
}

export default NxtCommunication;
