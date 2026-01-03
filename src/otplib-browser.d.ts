declare module "@otplib/preset-browser" {
  export const authenticator: {
    options: {
      digits?: number;
      step?: number;
      window?: number;
    };
    generate(secret: string): string;
    generateSecret(): string;
    keyuri(accountName: string, issuer: string, secret: string): string;
    verify(opts: { token: string; secret: string }): boolean;
  };
}
