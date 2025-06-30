export interface Snippet {
  name: string;
  prefix: string;
  body: string[];
  description: string;
  scope?: string[];
}

export const snippets: Snippet[] = [
  {
    name: "yapi",
    prefix: "yapi",
    body: [
      "const ${1:fetchData} = async () => {",
      "\ttry {",
      "\t\tconst response = await fetch('${2:https://api.example.com/endpoint}');",
      "\t\tconst data = await response.json();",
      "\t\treturn data;",
      "\t} catch (error) {",
      "\t\tconsole.error('API Error:', error);",
      "\t\tthrow error;",
      "\t}",
      "};"
    ],
    description: "Create an async API call function",
    scope: ["javascript", "typescript", "javascriptreact", "typescriptreact"]
  },
  {
    name: "yerr",
    prefix: "yerr",
    body: [
      "class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {",
      "\tconstructor(props) {",
      "\t\tsuper(props);",
      "\t\tthis.state = { hasError: false };",
      "\t}",
      "",
      "\tstatic getDerivedStateFromError(error) {",
      "\t\treturn { hasError: true };",
      "\t}",
      "",
      "\tcomponentDidCatch(error, errorInfo) {",
      "\t\tconsole.error('Error caught by boundary:', error, errorInfo);",
      "\t}",
      "",
      "\trender() {",
      "\t\tif (this.state.hasError) {",
      "\t\t\treturn <h1>Something went wrong.</h1>;",
      "\t\t}",
      "\t\treturn this.props.children;",
      "\t}",
      "}"
    ],
    description: "Create a React Error Boundary component",
    scope: ["javascriptreact", "typescriptreact"]
  },
  {
    name: "yfetch",
    prefix: "yfetch",
    body: [
      "const use${1:FetchData} = (url: string) => {",
      "\tconst [data, setData] = useState<${2:any}>(null);",
      "\tconst [loading, setLoading] = useState(true);",
      "\tconst [error, setError] = useState<Error | null>(null);",
      "",
      "\tuseEffect(() => {",
      "\t\tconst fetchData = async () => {",
      "\t\t\ttry {",
      "\t\t\t\tsetLoading(true);",
      "\t\t\t\tconst response = await fetch(url);",
      "\t\t\t\tif (!response.ok) throw new Error('Failed to fetch');",
      "\t\t\t\tconst result = await response.json();",
      "\t\t\t\tsetData(result);",
      "\t\t\t} catch (err) {",
      "\t\t\t\tsetError(err as Error);",
      "\t\t\t} finally {",
      "\t\t\t\tsetLoading(false);",
      "\t\t\t}",
      "\t\t};",
      "\t\tfetchData();",
      "\t}, [url]);",
      "",
      "\treturn { data, loading, error };",
      "};"
    ],
    description: "Create a custom hook for data fetching",
    scope: ["typescript", "typescriptreact"]
  },
  {
    name: "yslice",
    prefix: "yslice",
    body: [
      "import { createSlice, PayloadAction } from '@reduxjs/toolkit';",
      "",
      "interface ${1:SliceName}State {",
      "\t${2:value}: ${3:number};",
      "}",
      "",
      "const initialState: ${1:SliceName}State = {",
      "\t${2:value}: ${4:0},",
      "};",
      "",
      "export const ${5:sliceName}Slice = createSlice({",
      "\tname: '${5:sliceName}',",
      "\tinitialState,",
      "\treducers: {",
      "\t\t${6:setValue}: (state, action: PayloadAction<${3:number}>) => {",
      "\t\t\tstate.${2:value} = action.payload;",
      "\t\t},",
      "\t},",
      "});",
      "",
      "export const { ${6:setValue} } = ${5:sliceName}Slice.actions;",
      "export default ${5:sliceName}Slice.reducer;"
    ],
    description: "Create a Redux Toolkit slice",
    scope: ["typescript", "typescriptreact"]
  },
  {
    name: "yroute",
    prefix: "yroute",
    body: [
      "router.${1|get,post,put,delete,patch|}('/${2:path}', async (req, res) => {",
      "\ttry {",
      "\t\t${3:// Route logic here}",
      "\t\tres.status(200).json({",
      "\t\t\tsuccess: true,",
      "\t\t\tdata: ${4:result}",
      "\t\t});",
      "\t} catch (error) {",
      "\t\tres.status(500).json({",
      "\t\t\tsuccess: false,",
      "\t\t\terror: error.message",
      "\t\t});",
      "\t}",
      "});"
    ],
    description: "Create an Express route handler",
    scope: ["javascript", "typescript"]
  },
  {
    name: "ytest",
    prefix: "ytest",
    body: [
      "describe('${1:Component/Function}', () => {",
      "\tbeforeEach(() => {",
      "\t\t${2:// Setup}",
      "\t});",
      "",
      "\tit('should ${3:do something}', () => {",
      "\t\t${4:// Test implementation}",
      "\t\texpect(${5:result}).toBe(${6:expected});",
      "\t});",
      "",
      "\tit('should ${7:handle error case}', () => {",
      "\t\t${8:// Error test}",
      "\t\texpect(() => ${9:action}).toThrow();",
      "\t});",
      "});"
    ],
    description: "Create a test suite with Jest",
    scope: ["javascript", "typescript", "javascriptreact", "typescriptreact"]
  },
  {
    name: "ystyled",
    prefix: "ystyled",
    body: [
      "import styled from 'styled-components';",
      "",
      "export const ${1:StyledComponent} = styled.${2|div,button,span,section,article|}`",
      "\t${3:/* CSS properties */}",
      "\tdisplay: ${4:flex};",
      "\tpadding: ${5:1rem};",
      "\t",
      "\t&:hover {",
      "\t\t${6:/* Hover styles */}",
      "\t}",
      "\t",
      "\t@media (max-width: 768px) {",
      "\t\t${7:/* Mobile styles */}",
      "\t}",
      "`;"
    ],
    description: "Create a styled component",
    scope: ["javascript", "typescript", "javascriptreact", "typescriptreact"]
  },
  {
    name: "ygql",
    prefix: "ygql",
    body: [
      "const ${1:GET_DATA} = gql`",
      "\tquery ${2:GetData}(\\$${3:id}: ${4:ID!}) {",
      "\t\t${5:data}(${3:id}: \\$${3:id}) {",
      "\t\t\t${6:id}",
      "\t\t\t${7:name}",
      "\t\t\t${8:description}",
      "\t\t}",
      "\t}",
      "`;"
    ],
    description: "Create a GraphQL query",
    scope: ["javascript", "typescript", "javascriptreact", "typescriptreact"]
  },
  {
    name: "yasync",
    prefix: "yasync",
    body: [
      "const ${1:asyncHandler} = async (${2:params}) => {",
      "\tconst loading = true;",
      "\tconst error = null;",
      "\t",
      "\ttry {",
      "\t\t${3:// Async operation}",
      "\t\tconst result = await ${4:someAsyncFunction}();",
      "\t\treturn {",
      "\t\t\tsuccess: true,",
      "\t\t\tdata: result,",
      "\t\t\tloading: false",
      "\t\t};",
      "\t} catch (err) {",
      "\t\tconsole.error('Error in ${1:asyncHandler}:', err);",
      "\t\treturn {",
      "\t\t\tsuccess: false,",
      "\t\t\terror: err.message,",
      "\t\t\tloading: false",
      "\t\t};",
      "\t}",
      "};"
    ],
    description: "Create an async handler with error handling",
    scope: ["javascript", "typescript"]
  },
  {
    name: "yform",
    prefix: "yform",
    body: [
      "const handle${1:Submit} = (event: React.FormEvent<HTMLFormElement>) => {",
      "\tevent.preventDefault();",
      "\t",
      "\tconst formData = new FormData(event.currentTarget);",
      "\tconst ${2:data} = {",
      "\t\t${3:field1}: formData.get('${3:field1}') as string,",
      "\t\t${4:field2}: formData.get('${4:field2}') as string,",
      "\t};",
      "\t",
      "\t${5:// Process form data}",
      "\tconsole.log('Form submitted:', ${2:data});",
      "};"
    ],
    description: "Create a form submit handler",
    scope: ["typescript", "typescriptreact"]
  }
];