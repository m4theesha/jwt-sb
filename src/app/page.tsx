/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'

import { Button } from '@headlessui/react'
import type { editor as MonacoEditorType } from 'monaco-editor'
import stripJsonComments from 'strip-json-comments';

export default function HomePage() {
  const [isDark, setIsDark] = useState(false)
  const [tOut, setTOut] = useState('')
  const [pOut, setPOut] = useState('')
  const [alg, setAlg] = useState('HS256')
  const [validity, setValididy] = useState('')

  const monaco = useMonaco()
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null)
  
  //to allow comments in the editor
  useEffect(() => {
    if (monaco) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
      })
    }
  }, [monaco])

  // Check theme on component mount and when it changes
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }

    // Initial check
    checkTheme()

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          checkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!monaco) return

    // Define custom dark theme
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'd4d4d4' },
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c586c0' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'type', foreground: '569cd6' },
      ],
      colors: {
        'editor.background': '#030712',
        'editor.foreground': '#d4d4d4',
        'editorCursor.foreground': '#c0c0c0',
        'editor.lineHighlightBackground': '#101828',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    })

    // Set theme based on current dark mode state
    monaco.editor.setTheme(isDark ? 'custom-dark' : 'vs-light')
  }, [monaco, isDark])

  function handleEditorDidMount(editor: MonacoEditorType.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) {
    editorRef.current = editor;
  }
  //check the validity of the inputted JSON before signing
  function isValidJSON(str: string) {
    try {
      JSON.parse(str)
      return str
    } catch (e) {
      alert('Invalid JSON in the payload')
      return
    }
  }
  //replace time keywords in the payload with current time + {requestedTime}
  function replaceKeywords(i: string | undefined): string | undefined {
    return i?.replace('{NOW}', Math.floor(Date.now() / 1000).toString())
      .replace('{+30s}', Math.floor((Date.now() + 30 * 1000) / 1000).toString())
      .replace('{+1min}', Math.floor((Date.now() + 60 * 1000) / 1000).toString())
      .replace('{+2min}', Math.floor((Date.now() + 120 * 1000) / 1000).toString())
  }

  //sign the given payload
  async function signJWT() {
    const res = await fetch('/api/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payload: JSON.parse(isValidJSON(stripJsonComments(replaceKeywords(editorRef.current?.getValue()) ?? '') ?? '') ?? ''),
        alg: alg
      })
    })

    const json = await res.json()
    setTOut(json.token)
  }
  //verify the validify of the signed JWT
  async function verifyJWT() {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: tOut
      })
    })

    const json = await res.json()
    setValididy(JSON.stringify(json.isValid, null, 2))
  }
  //decode the given JWT and output the payload
  async function decodeJWT() {
    const res = await fetch('/api/decode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: tOut
      })
    })

    const json = await res.json()
    setPOut(JSON.stringify(json.payload, null, 2))
  }
  //Editor wrapper to make every editor responsive
  const EditorWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="w-screen sm:w-screen lg:w-[50vw] max-w-full border dark:border-gray-800 border-gray-200">
      {children}
    </div>
  )

  const defaultPayload = {
    "sub": "4321",
    "name": "Matheesha",
    "iat": "{NOW}",
    "nbf": "{+30s}",
    "exp": "{+1min}"
  }

  return (
    <>
      <div className='w-full flex flex-col md:flex-row dark:bg-gray-950 dark:text-white'>
        <div id='input' className=''>
          <h3 className='m-2'>Payload to sign (header is added by the library)</h3>
          {/* Payload to be signed */}
          <EditorWrapper>
            <Editor
              height="50vh"
              defaultLanguage="json"
              defaultValue={JSON.stringify(defaultPayload, null, 2) + '\n\n//keywords:\n\n//{NOW} = current time\n//{+30s} = current time + 30 seconds\n//{+1min} = current time + 1 minute\n//{+2min} = current time + 2 minutes\n\n//If any of the above keywords are in the payload JSON,\n//it will be replaced with above conditions\n//You can either remove or keep these comments, the payload will be sanitized'}
              onMount={handleEditorDidMount}
              theme={isDark ? 'custom-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                formatOnType: true,
                formatOnPaste: true,
                fontSize: 14,
              }}
            />
          </EditorWrapper>

          <h3 className='mt-2.5 ml-2.5'>Algorithm</h3>

          <select value={alg} onChange={(e) => setAlg(e.target.value)} className='w-[150px] h-fit m-2.5 border cursor-pointer dark:bg-gray-900 dark:border-gray-800 border-gray-300 rounded-[6px] p-1'>
            <option value='HS256'>HS256</option>
            <option value='HS384'>HS384</option>
            <option value='HS512'>HS512</option>
          </select><br></br>
          {/* Sign the given payload */}
          <Button onClick={signJWT} className="m-2.5 inline-flex items-center gap-2 rounded-md cursor-pointer dark:bg-white dark:text-black bg-gray-700 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline dark:hover:bg-gray-400 hover:bg-gray-600 open:bg-gray-700">
            Sign Payload
          </Button>
        </div>
        {/* Signed JWT */}
        <div id='output'>
          <h3 className='m-2'>JWT output</h3>
          <EditorWrapper>
            <Editor
              height="15vh"
              value={tOut}
              defaultLanguage="plaintext"
              defaultValue="//output goes here"
              theme={isDark ? 'custom-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "off",
                wordWrap: "on",
              }}
            />
          </EditorWrapper>
          {/* Verify the signed JWT */}
          <Button onClick={verifyJWT} className="m-2.5 inline-flex items-center gap-2 rounded-md cursor-pointer dark:bg-white dark:text-black bg-gray-700 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white dark:hover:bg-gray-400 data-hover:bg-gray-600 data-open:bg-gray-700">
            Verify JWT
          </Button>
          {/* Decode a signed JWT */}
          <Button onClick={decodeJWT} className="m-2.5 inline-flex items-center gap-2 rounded-md cursor-pointer dark:bg-white dark:text-black bg-gray-700 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white dark:hover:bg-gray-400 data-hover:bg-gray-600 data-open:bg-gray-700">
            Decode JWT
          </Button>
          {/* Response from api/verify */}
          <h3 className='m-2'>Response from verify()</h3>
          <EditorWrapper>
            <Editor
              height="15vh"
              value={validity}
              defaultLanguage="json"
              defaultValue='//verify function response'
              theme={isDark ? 'custom-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                readOnly: true,
                fontSize: 14,
              }}
            />
          </EditorWrapper>
          {/* Decoded Payload output */}
          <h3 className='m-2'>Decoded payload</h3>
          <EditorWrapper>
            <Editor
              height="40vh"
              value={pOut}
              defaultLanguage="json"
              defaultValue='//decoded JWT payload'
              theme={isDark ? 'custom-dark' : 'vs-light'}
              options={{
                minimap: { enabled: false },
                readOnly: true,
                fontSize: 14,
              }}
            />
          </EditorWrapper>
        </div>
      </div>
      {/* footer */}
      <div className='flex items-center bottom-0 left-0 fixed w-screen text-[10px] sm:text-[10px] md:text-[16px] h-fit p-3 border-t dark:bg-gray-950 dark:text-white dark:border-gray-800 bg-white border-gray-200'>
        <p className='w-fit'>Made by <a href='https://github.com/m4theesha' className='text-[#2663fa]'>Matheesha</a></p>
        <div className='flex space-x-3 justify-end items-center ml-auto'>
          <p className='text-gray-500'>Built with <a href='https://react.dev/' className='text-[#2663fa]'>React</a>, <a href='https://nextjs.org/' className='text-[#2663fa]'>Next.js</a>, <a href='https://www.npmjs.com/package/@monaco-editor/react' className='text-[#2663fa]'>Monaco Editor</a>, and <a href='https://github.com/4zeroiv/jwt' className='text-[#2663fa]'>JWT library</a> by <a href='https://github.com/ItsMatheesha' className='text-[#2663fa]'>Matheesha</a></p>
          <a href='https://github.com/m4theesha/jwtkn'>
            <img src='https://skills.syvixor.com/api/icons?i=github' alt='github' width='40px' height='40px' />
          </a>
          <a href='https://www.npmjs.com/package/jwtkn'>
            <img src='https://skills.syvixor.com/api/icons?i=npm' alt='github' width='40px' height='40px' />
          </a>
        </div>
      </div>
    </>
  )
}
