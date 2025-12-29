import * as React from "react";
import styled from "@emotion/styled";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const Card = styled.div`
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
`;

export const CardHeader = styled.div`
  padding: 20px 24px 0;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 800;
`;

export const CardDescription = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

export const CardContent = styled.div`
  padding: 24px;
`;

export const CardFooter = styled.div`
  padding: 0 24px 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
`;
