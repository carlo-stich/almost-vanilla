# Almost vanilla

A lightweight static site builder that lets you use partials, include components, and inject dynamic variables — without complex tooling. Perfect for small static projects.

## Installation
1. Using `package.json`
- Run `npm i`
- Run `node compiler.js`

2. Without using `package.json`
- Run `npm i ws`
- Run `node compiler.js`

Make sure you're running this from the root of the project (same folder as `compiler.js`)

## Live reload
To enable live reload use the optional `-watch` parameter

Example:
`node compiler.js -watch`

## Usage
1. Create a folder called `website` in your root folder (same as the `compiler.js`)
2. In that folder create your first html file, call it `index.html`
3. You can create as many subfolders as you like — it's recommended to create an `index.html` in each one.

### Include files
You can create "components" and include them in any html file inside the root `website` folder.

1. Create the component

    Create an html file with any name, I recommend placing them in a folder called `components` or similar. 
    
    - Example: `/website/components/button.html`

2. Include the component

    Use `[[ filename ]]` in any file to include that file. The path is always relative to the `website` folder.
    
    - Example `[[ components/button.html ]]`

3. Prevent folders/files from being copied to the build

    If you don't want a component or component folder to be included in your final dist folder after building, use an underscore (`_`) in front of the file or folder name:

    A `_folder` will exclude the folder and all its contents from the build.

    A `_file` will exclude only that file.

    📌 Note: If a file is already inside an underscored folder (like `_components/`), you don’t need to prefix the file itself with an underscore.
        
    <details>
    <summary>
        Example (expand)
    </summary>

    Change file/folder name to `/website/_components/button.html` or `/website/_button.html`
    
    Now include the file like this: `[[ _components/button.html ]]`
    
    The `dist` folder will now include the `index.html` file (with the button element) but the `_components` folder or its content will not be created

    Before: 
    ```
    /dist
    - index.html
    - /components
       - button.html
    ```
    
    After:

    ```
    /dist
    - index.html
    ```
    
    </details>
    <br>

4. Use dynamic components

    You can create dynamic components like this: `[[ filename (variable=value) ]]`

    And use the variable in `filename` like this: `[variable]`. This will replace `[variable]` with `value`.

    <details>
    <summary>
        Example (expand)
    </summary>

    `components/button.html`
    ```
    <button class="btn">[text]</button>
    ```

    `index.html`

    ```
    [[ /components/button.html (text=Click me!) ]]
    [[ /components/button.html (text=Also me) ]]
    ```

    Result:

    `dist/index.html`
    ```
    <button class="btn">Click me!</button>
    <button class="btn">Also me</button>
    ```
    </details>

    #### Multiple variables

    You can use multiple variables by separating them with commas, like this: `[[ filename (variable=value, variable2=value2) ]]`

    
    <details>
    <summary>
        Example (expand)
    </summary>

    `components/button.html`
    ```
    <button class="[class]">[text]</button>
    ```

    `index.html`

    ```
    [[ /components/button.html (text=Remove, class=red-btn) ]]
    [[ /components/button.html (text=Update, class=green-btn) ]]
    ```
    
    Result:

    `dist/index.html`
    ```
    <button class="red-btn">Remove</button>
    <button class="green-btn">Update</button>
    ```
    </details>
    <hr>

    > Made with <3 by Carlo S.