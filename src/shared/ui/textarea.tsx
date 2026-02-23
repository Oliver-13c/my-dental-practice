'use client';

import React from 'react';

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`border p-2 rounded ${props.className || ''}`} />;
}
