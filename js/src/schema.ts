class Payload {
  instruction: number;
  args: Args;

  constructor(data: { instruction: number; args: Args }) {
    this.instruction = data.instruction;
    this.args = data.args;
  }
}

class Args {
  lamports: null | number;
  metadata_bump: null | number;

  constructor(data: { lamports: null | number; metadata_bump: null | number }) {
    this.lamports = data.lamports;
    this.metadata_bump = data.metadata_bump;
  }
}

const schema = new Map<any, any>([
  [
    Payload,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["args", Args],
      ],
    },
  ],
  [
    Args,
    {
      kind: "struct",
      fields: [
        [
          "lamports",
          {
            kind: "option",
            type: "u64",
          },
        ],
        [
          "metadata_bump",
          {
            kind: "option",
            type: "u8",
          },
        ],
      ],
    },
  ],
]);

export { Payload, Args, schema };
