[Sitemap](https://medium.com/sitemap/sitemap.xml)

[Open in app](https://play.google.com/store/apps/details?id=com.medium.reader&referrer=utm_source%3DmobileNavBar&source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2Ftechtrends-digest%2Fthe-complete-guide-to-shadcn-ui-and-turborepo-integration-efd41efeed31&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

[Medium Logo](https://medium.com/?source=post_page---top_nav_layout_nav-----------------------------------------)

Get app

[Write](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Fnew-story&source=---top_nav_layout_nav-----------------------new_post_topnav------------------)

[Search](https://medium.com/search?source=post_page---top_nav_layout_nav-----------------------------------------)

Sign up

[Sign in](https://medium.com/m/signin?operation=login&redirect=https%3A%2F%2Fmedium.com%2Ftechtrends-digest%2Fthe-complete-guide-to-shadcn-ui-and-turborepo-integration-efd41efeed31&source=post_page---top_nav_layout_nav-----------------------global_nav------------------)

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

[**Coffee☕ And Code💚**](https://medium.com/techtrends-digest?source=post_page---publication_nav-c8f13a2b09db-efd41efeed31---------------------------------------)

·

Follow publication

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:38:38/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---post_publication_sidebar-c8f13a2b09db-efd41efeed31---------------------------------------)

Where coding meets caffeine. Fueling developers with code, creativity, and a dash of inspiration

Follow publication

# **The Complete Guide to Integrating Shadcn UI with Turborepo**

[![Amir Mirfallahi](https://miro.medium.com/v2/resize:fill:32:32/1*BDME2QXEa5aVYuuBICxbtg.jpeg)](https://medium.com/@amirmirfallahi?source=post_page---byline--efd41efeed31---------------------------------------)

[Amir Mirfallahi](https://medium.com/@amirmirfallahi?source=post_page---byline--efd41efeed31---------------------------------------)

Follow

10 min read

·

Dec 10, 2025

24

[Listen](https://medium.com/m/signin?actionUrl=https%3A%2F%2Fmedium.com%2Fplans%3Fdimension%3Dpost_audio_button%26postId%3Defd41efeed31&operation=register&redirect=https%3A%2F%2Fmedium.com%2Ftechtrends-digest%2Fthe-complete-guide-to-shadcn-ui-and-turborepo-integration-efd41efeed31&source=---header_actions--efd41efeed31---------------------post_audio_button------------------)

Share

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*-m51ugoCk80JZ3Il8qeVxQ.jpeg)

Recently, I was planning to create a large-scale project and was looking for the best solution considering maintenance, scalability, and quality issues.

After conducting some research, I discovered something that was very helpful. **Turborepo,** developed by Vercel, is a powerful tool that simplifies monorepo project management. It has lots of features, including smart caching and parallel building.

## What is the problem?

There are a few issues with integrating shadcn in a turborepo project inside `packages/ui`. The major difficulty is the lack of good documentation. If you check turborepo documentation, you will not be able to find much information. It only mentions that, you have to execute `pnpm dlx shadcn@latest init`. It does not mention where to execute this command.

While **AI tools** might seem helpful for this task, they currently struggle with this specific integration due to limited training data on Turborepo + Shadcn setups. Manual configuration is more reliable.

Don’t worry. I will tell you the best way to integrate it. In addition, I will discuss the solutions I have tested and failed.

## Prerequisites

- **Node.js** (v18 or higher)
- **TypeScript** (v5 or higher)
- **Next.js** v16
- **Turbo** v2
- **pnpm** v10
- **Tailwind CSS** v4
- **Shadcn** latest

## What you’ll build

You’ll build an application based on monorepo architecture using Turborepo. It will contain a ui package which is shared across the codebase. Shadcn components are focused here.

## Monorepo

First, you must understand what “monorepo” is. According to Wikipedia, a “monorepo” is a software development strategy in which the code for several projects is stored in the same repository. They somehow share a codebase.

Monorepos have various advantages, such as code reuse, simplified dependency management, and collaboration across teams.

Despite these advantages, it has a major disadvantage, as stated in Turborepo documentation:

> “Each workspace has its own test suite, its own linting, and its own build process. A single monorepo might have **thousands of tasks to execute**.”

## Turborepo

Turborepo was originally created by [Jared Palmer](https://x.com/jaredpalmer) as a closed-source software. In late 2021, Vercel acquired Turborepo and open-sourced its codebase.

Currently, many companies, including Vercel, AWS, and Microsoft, use Turborepo in their teams. See [Turborepo showcase.](https://turborepo.com/showcase)

Let’s begin by setting up the project structure.

## Creating our project

Now, let us start our new turbo project. In this tutorial, we will use **pnpm** as the package manager. We will create a new Turbo project with Tailwind already installed.

```
pnpm dlx create-turbo@latest -e with-tailwind
```

This will ask you a few questions, such as the name of the codebase and the package manager you want to use, which in this case is pnpm.

Congratulations! You have taken the first step in Turborepo world. If you open the codebase in a text editor, you will see several directories and files. We will examine each of these items.

## Understanding the Configuration

### Turbo.json

This file is used to configure the turbo behavior. We can configure the tasks, caching, concurrency, and many other aspects. If you open it, you will see the basic commands.

### pnpm-workspace.yaml

We set up our workspace here. By default, it contains two workspaces: `app` and `doc`.

### Package.json

This is the standard `package.json` you’re already familiar with.

### Apps directory

This directory contains all applications. By default, it contains two Next. js applications, web, and doc. Each app has its own `package.json`.

### Packages directory

Assume that you have a UI library that you want to share among your applications. To avoid duplication, we have shared our packages. It contains the following packages: ESLint configurations, Tailwind configurations (because we created our turbo project with Tailwind), TypeScript configurations, and UI package.

## Verifying Turbo Installation

Do you remember using `pnpm run dev` to run your applications during the development stage? In turbo, we perform a similar operation. You have 2 options.

1. Installing **turbo CLI**
2. Using pnpm commands (Same as Before)

**Turbo CLI:** We can install the turbo CLI and use it to run all apps and packages in parallel.

To install it, you can use your package manager `pnpm add -g turbo`. Then you can run your applications using turbo, `turbo dev`

**PNPM Commands:** We can do this as before by running `pnpm run dev` because, by default, turbo is installed in your project, and running this command is similar to running `turbo dev`.

Press enter or click to view image in full size

![](https://miro.medium.com/v2/resize:fit:700/1*cxjhu90H3xgLPBvMJysLzw.png)

All apps & packages running

## Integrating Shadcn

Now, let us turn to the main topic. Shadcn, As you know, is a powerful ui library, and we use it to build modern websites in a simpler way.

### What is the integration workflow?

Modifying tsconfig.json → components.json → installing packages → creating necessary utility functions → setting up **TSUP →** adding custom styles (optional) → exporting files from `packages/ui`

### 1\. Modifying tsconfig.json

We must add an alias and configure baseUrl. Change the compilerOptions in the tsconfig.json file.

```
  "compilerOptions": {
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
```

## 2\. Component.json

This file is the brain of our shadcn project. It tells the CLI where to place the necessary files, how to structure imports, and the Tailwind configurations. Understanding this file is crucial because it controls almost everything.

Because we want to have all our shadcn components in `packages/ui` and shared across the application, we create `components.json` in `packages/ui`.

```
cd packages/ui
touch components.json
```

### Schema

At the beginning of this file, we can specify the `schema` of component.json. This reference is helpful because it will tell the IDE what the `component.json` should look like. It provides IDE support with validation and autocomplete, which is truly amazing.

## Get Amir Mirfallahi’s stories in your inbox

Join Medium for free to get updates from this writer.

Subscribe

Subscribe

Remember me for faster sign in

Therefore, we added this line to the top of component.json.

```
{
  "$schema": "https://ui.shadcn.com/schema.json"
}
```

### Tailwindcss configuration

Another important aspect of `components.json` is the tailwind section, which, _as stated in shadcn documentation,_ is the most complicated configuration. In this section, we specify the `tailwind.config.js` and `globals.css` paths. Moreover, we can specify shadcn color palette that we want to use.

> Note: When using Tailwind CSS v4, the ‘config’ field in components.json is optional as v4 uses a different configuration approach.

```
{
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/styles.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  }
}
```

### Icon Library

We can set an icon library for shadcn. Currently, we are using `lucide-react`.

### Aliases

I think this section is the most tricky when integrating Turborepo. This is where we set the alias components, utils, etc. I will tell you why we used the “@” alias for all of them. Shadcn cannot be used without these two aliases.

```
{
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/components/lib",
    "hooks": "@/hooks"
  }
}
```

If we combine these, we obtain the final `components.json`.

```
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js", // not necessary if you are in v4
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

> For further information, you can read this documentation from shadcn: [https://vercel.com/academy/shadcn-ui/components-json](https://vercel.com/academy/shadcn-ui/components-json)

## 3\. Configuring tsconfig.json

As you can see above, all aliases begin with a “@”. But we haven’t set “@” alias in tsconfig.json yet. So we have to set “@” as an alias to “src/” directory. To do so, just add these few lines to `compilerOptions` in `tsconfig.json` located in `packages/ui`.

```
{
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
}
```

## 4\. Add necessary utility function

If you have ever used shadcn, you know that the `cn` utility function is required. Therefore, we must create a new file in `packages/ui/src/lib` named `utils.ts`. This function merges multiple tailwind classes.

```
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## 5\. Installing necessary packages

Until now, we have used many packages, but we have not added them to `package.json`. Therefore, we must install them in the UI package, `packages/ui`.

```
pnpm add class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

## 6\. Adding new shadcn components

It is time to start our shadcn components. For example, we first want to add a `button` component and use it inside the `web` app. To add a new component, we use the same process as described above. This creates a button component inside `packages/ui/src/components/ui`.

```
cd packages/ui
pnpm dlx shadcn@latest add button
```

### The most important part

If you export the button and use it inside an app, such as `apps/web`, you will get an error that says @/lib/utils is not recognized, even though it exists.

After conducting extensive research, I discovered that the ui package uses `tsc` to build by default. We will then use the built component in `dist` in our apps. In the built version of our code, we can see that it tries to import our `utils` file without its relative path, and it uses the same relative path as we had. Now, TS recognizes the path, but when we access that file from outside, in this case, the `web` app, it cannot recognize the alias.

Therefore, to resolve this issue, we can simply use `tsup` instead of `tsc`. To change this, we should first install `tsup` inside `packages/ui`.

```
pnpm add -D tsup
```

Then, we must create our config file. Tsup config file is `tsup.config.ts`. We should specify the paths of our entry files, and `tsconfig.json` file. Like this:

```
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.tsx", "src/**/*.ts", "src/styles.css"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  tsconfig: "./tsconfig.json",
});
```

### CSS file keeps deleting

Another problem occurs after installing `tsup`. The problem is when you run `turbo dev`, `dev:styles` and `dev:components` commands will be executed in parallel. As we set `clean: true` in our `tsup.config.ts`, `index.css` file will be removed once created.

### Recommended Configuration

We can resolve this issue in many ways, however I recommend this approach. The simplest and fastest way to do it is to change the directory where tsup bundles our code. To perform this, we must add configure`outdir` in `tsup.config.ts`. It can have any value.

```
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.tsx", "src/**/*.ts", "src/styles.css"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outdir: "dist/tsup",
  external: ["react", "react-dom"],
  tsconfig: "./tsconfig.json",
});
```

### Alternate approaches

- Approach A: Another approach is to completely disable `clean` in `tsup` which in the future might cause some problems with bundle size of `dist`.
- Approach B: A similar way to prevent this issue is to disable clean when the app is in development stage. You can see an environment variable to check this.
- Approach C: We also have the option to configure separated commands for `dev` and `build` in `packages.json`. Then we have to change our `turbo.json` to use those commands. We can use `--onSuccess` in tsup, and for `dev` we can add a small delay before `dev:styles` to generate after `dev:components`.

> **Our Choice** We use the `outdir` approach because it’s simple and doesn’t compromise build performance.

Now, we only have to change the build and dev commands in the package.json of our UI package. These are our modified scripts.

```
{
    "build:components": "tsup",
    "check-types": "tsup --dts",
    "dev:components": "tsup --watch"
}
```

- **build:components**: Builds all components for production
- **check-types**: Generates TypeScript declaration files
- **dev:components**: Watches for changes and rebuilds automatically

> Congratulations! You’ve almost integrated shadcn and turborepo.

## 7\. Exporting build files

The last thing we have to do is export our build files from `packages/ui` and use them inside `apps/web`. In `package.json` of `packages/ui` we must add some exports.

```
{
    "./styles.css": "./dist/index.css",
    "./shadcn/ui/*": "./dist/tsup/components/ui/*.mjs",
    "./lib/*": "./dist/lib/*.mjs"
}
```

## 8\. Customizing tailwindcss theme (optional)

Recently, I discovered an interesting tool for generating shadcn themes. Its name is [tweakcn](https://tweakcn.com/). We can generate a new theme with it and then copy the styles and paste them in our `packages/ui/src/styles.css`. Furthermore, you can add it inside `packages/tailwind-config/shared-styles.css`.

```
/* Component-level styles for the UI package */
@import "tailwindcss";
@import "@repo/tailwind-config";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
/* The code you copied from tweakcn will be here... */
```

## Using components in an app

You can now add any component you want, and you can import it from `@repo/ui`.

For example, if you want to import the button component, you can do it this way.

```
import { Button } from "@repo/ui/shadcn/ui/button"

// leave the rest of the code here.

<Button variant="outline">Button</Button>
```

## Troubleshooting

### Error: Cannot find module ‘@/lib/utils’

**Cause:** Either the path alias isn’t configured in tsconfig.json or tsup isn’t configured properly.

**Solution**

Step 1: Check if your tsconfig.json **includes** this.

```
"compilerOptions": {
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
}
```

Step 2: Check if tsup is installed and you have `tsup.config.ts` in your `packages/ui`.

```
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.tsx", "src/**/*.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist/tsup",
  external: ["react", "react-dom"],
  tsconfig: "./tsconfig.json",
});
```

### Error: Module not found ‘@repo/ui/shadcn/ui/button’

**Cause:** The exports in `packages/ui/package.json` might be incorrect, or the build hasn’t been run.

**Solution**

Step 1: Check if `.mjs` files exist in `dist/` directory.

Step 2: Run `pnpm run build:components` in `packages/ui/package.json`.

Step 3: Verify the exports field matches the pattern shown in step 7.

### Error: Components have improper styling

**Cause:** If `shared-styling.css` is not imported in other css files.

**Solution**

Step 1: Check imports of `apps/web/app/globals.css` or `packages/ui/styles.css`. They must all have `@import("@repo/tailwind-config")`.

## What else we could do?

We also have an easier way to integrate shadcn. We have a command to initialize shadcn in a framework. If we go to `apps/web` and run `pnpm dlx shadcn@latest init`, shadcn cli will ask a few questions, and shadcn will be initialized.

Imagine that you have five apps, and all of them use shadcn. We encounter a big problem, which is that we duplicate components multiple times. This slows down the build, increases the bundle size, and makes the codebase larger.

## Final Codebase Tree

```
.
├── .turbo
├── apps/
│   ├── web
│   └── docs
├── node_modules/
├── packages/
│   ├── eslint-config/
│   │   ├── node_modules/
│   │   ├── base.js
│   │   ├── next.js
│   │   ├── react-internal.js
│   │   └── package.json
│   ├── tailwind-config/
│   │   ├── node_modules/
│   │   ├── postcss.config.js
│   │   ├── shared-styles.css
│   │   └── package.json
│   ├── typescript-config/
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   ├── react-library.json
│   │   └── package.json
│   └── ui/
│       ├── node_modules/
│       ├── src/
│       │   ├── lib/
│       │   │   └── utils.ts
│       │   ├── card.tsx
│       │   ├── gradient.tsx
│       │   ├── styles.css
│       │   └── turborepo-logo.tsx
│       ├── components.json
│       ├── eslint.config.mjs
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── turbo.json
├── package.json
├── turbo.json
├── README.md
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── .npmrc
└── .gitignore
```

## Next Steps

Now that you have Shadcn integrated with Turborepo, you can:

- Add more Shadcn components using pnpm `dlx shadcn@latest add <component-name>`.
- Create custom components in `packages/ui/src/components`.
- Share utility functions across apps via `packages/ui/src/lib`.

## Conclusion

This guide aims to present the most effective approach for integrating turborepo with shadcn. After extensive research, it became clear that many developers seek comprehensive guidance on this integration. Therefore, this guide has been created to address that need and assist the community.

[Turborepo](https://medium.com/tag/turborepo?source=post_page-----efd41efeed31---------------------------------------)

[Shadcn](https://medium.com/tag/shadcn?source=post_page-----efd41efeed31---------------------------------------)

[Nextjs](https://medium.com/tag/nextjs?source=post_page-----efd41efeed31---------------------------------------)

[React](https://medium.com/tag/react?source=post_page-----efd41efeed31---------------------------------------)

[Monorepo](https://medium.com/tag/monorepo?source=post_page-----efd41efeed31---------------------------------------)

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:48:48/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---post_publication_info--efd41efeed31---------------------------------------)

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:64:64/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---post_publication_info--efd41efeed31---------------------------------------)

Follow

[**Published in Coffee☕ And Code💚**](https://medium.com/techtrends-digest?source=post_page---post_publication_info--efd41efeed31---------------------------------------)

[419 followers](https://medium.com/techtrends-digest/followers?source=post_page---post_publication_info--efd41efeed31---------------------------------------)

· [Last published 10 hours ago](https://medium.com/techtrends-digest/your-git-history-is-lying-to-you-inside-glassworm-the-supply-chain-attack-that-rewrites-reality-80abb9289989?source=post_page---post_publication_info--efd41efeed31---------------------------------------)

Where coding meets caffeine. Fueling developers with code, creativity, and a dash of inspiration

Follow

[![Amir Mirfallahi](https://miro.medium.com/v2/resize:fill:48:48/1*BDME2QXEa5aVYuuBICxbtg.jpeg)](https://medium.com/@amirmirfallahi?source=post_page---post_author_info--efd41efeed31---------------------------------------)

[![Amir Mirfallahi](https://miro.medium.com/v2/resize:fill:64:64/1*BDME2QXEa5aVYuuBICxbtg.jpeg)](https://medium.com/@amirmirfallahi?source=post_page---post_author_info--efd41efeed31---------------------------------------)

Follow

[**Written by Amir Mirfallahi**](https://medium.com/@amirmirfallahi?source=post_page---post_author_info--efd41efeed31---------------------------------------)

0 followers

· [6 following](https://medium.com/@amirmirfallahi/following?source=post_page---post_author_info--efd41efeed31---------------------------------------)

Amir Mirfallahi \| Future Entrepreneur \| Passionate Software Developer \| Focusing on web development, building web apps and APIs using Laravel, Django, React,...

Follow

## No responses yet

![](https://miro.medium.com/v2/resize:fill:32:32/1*dmbNkD5D-u45r44go_cf0g.png)

Write a response

[What are your thoughts?](https://medium.com/m/signin?operation=register&redirect=https%3A%2F%2Fmedium.com%2Ftechtrends-digest%2Fthe-complete-guide-to-shadcn-ui-and-turborepo-integration-efd41efeed31&source=---post_responses--efd41efeed31---------------------respond_sidebar------------------)

Cancel

Respond

## More from Amir Mirfallahi and Coffee☕ And Code💚

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:20:20/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----0---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

In

[Coffee☕ And Code💚](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----0---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

by

[Gajanan Rajput💚](https://medium.com/@rajputgajanan50?source=post_page---author_recirc--efd41efeed31----0---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[**How to Use Seedance 2.0 for FREE (From Any Country) 🌍🎬**\\
\\
**Use Seedance 2.0 for FREE Anywhere in the World (Just Add a VPN & One Magic Prompt**](https://medium.com/techtrends-digest/how-to-use-seedance-2-0-for-free-from-any-country-5c72569c5221?source=post_page---author_recirc--efd41efeed31----0---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

Feb 14

[A clap icon159\\
\\
A response icon4](https://medium.com/techtrends-digest/how-to-use-seedance-2-0-for-free-from-any-country-5c72569c5221?source=post_page---author_recirc--efd41efeed31----0---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:20:20/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----1---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

In

[Coffee☕ And Code💚](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----1---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

by

[Shivangi Pandey](https://medium.com/@shivangi.pandey285?source=post_page---author_recirc--efd41efeed31----1---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[**My Goldman Sachs SDE2 Interview Experience**\\
\\
**I recently went through the interview process at Goldman Sachs for the role of SDE2 / Associate Engineer. With around 4 years of experience…**](https://medium.com/techtrends-digest/my-goldman-sachs-sde2-interview-experience-a1d927860ab0?source=post_page---author_recirc--efd41efeed31----1---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

Oct 2, 2025

[A clap icon37\\
\\
A response icon2](https://medium.com/techtrends-digest/my-goldman-sachs-sde2-interview-experience-a1d927860ab0?source=post_page---author_recirc--efd41efeed31----1---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:20:20/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----2---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

In

[Coffee☕ And Code💚](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----2---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

by

[Gajanan Rajput💚](https://medium.com/@rajputgajanan50?source=post_page---author_recirc--efd41efeed31----2---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[**🚀 You Can Now Run Claude Code Completely FREE**\\
\\
**Run Claude Code for Free in 2026 Local AI Coding Setup with Ollama + VS Code**](https://medium.com/techtrends-digest/you-can-now-run-claude-code-completely-free-6cd6dc648883?source=post_page---author_recirc--efd41efeed31----2---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

Feb 28

[A clap icon79](https://medium.com/techtrends-digest/you-can-now-run-claude-code-completely-free-6cd6dc648883?source=post_page---author_recirc--efd41efeed31----2---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[![Coffee☕ And Code💚](https://miro.medium.com/v2/resize:fill:20:20/1*zo7fBko1XooJvuTa6ySwcw.jpeg)](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----3---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

In

[Coffee☕ And Code💚](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31----3---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

by

[Moksh S](https://medium.com/@moksh.9?source=post_page---author_recirc--efd41efeed31----3---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[**Safer Goroutines with WaitGroup.Go() in Go 1.25**\\
\\
**Go 1.25 quietly shipped a small but elegant feature that can clean up a common source of bugs in concurrent Go code: Introducing…**](https://medium.com/techtrends-digest/safer-goroutines-with-waitgroup-go-in-go-1-25-39bdd2d83b64?source=post_page---author_recirc--efd41efeed31----3---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

Aug 2, 2025

[A clap icon28](https://medium.com/techtrends-digest/safer-goroutines-with-waitgroup-go-in-go-1-25-39bdd2d83b64?source=post_page---author_recirc--efd41efeed31----3---------------------67da4138_a2e8_4b1b_a237_f05d50635a9d--------------)

[See all from Amir Mirfallahi](https://medium.com/@amirmirfallahi?source=post_page---author_recirc--efd41efeed31---------------------------------------)

[See all from Coffee☕ And Code💚](https://medium.com/techtrends-digest?source=post_page---author_recirc--efd41efeed31---------------------------------------)

## Recommended from Medium

[![UX Planet](https://miro.medium.com/v2/resize:fill:20:20/1*A0FnBy5FBoVQC02SZXLXPg.png)](https://medium.com/ux-planet?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

In

[UX Planet](https://medium.com/ux-planet?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

by

[Nick Babich](https://medium.com/@101?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**Claude Skills 2.0 for Product Designers**\\
\\
**Anthropic has recently improved the process of creating new Claude Skills, and this improvement is so significant that it almost feels like…**](https://medium.com/ux-planet/claude-skills-2-0-for-product-designers-a86f4518b3ba?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Mar 7

[A clap icon334\\
\\
A response icon3](https://medium.com/ux-planet/claude-skills-2-0-for-product-designers-a86f4518b3ba?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[![Amy Rogers](https://miro.medium.com/v2/resize:fill:20:20/1*lAYmLh_7wy-k8wa_zGDcIA.jpeg)](https://medium.com/@amymrogers?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[Amy Rogers](https://medium.com/@amymrogers?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**Stop making colour palettes**\\
\\
**How to build a dynamic, accessible system with OKLCH**](https://medium.com/@amymrogers/stop-making-colour-palettes-644bbd3256c3?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Jan 17

[A clap icon185](https://medium.com/@amymrogers/stop-making-colour-palettes-644bbd3256c3?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[![CodeToDeploy](https://miro.medium.com/v2/resize:fill:20:20/1*s4SuUoJSUCQqhZfIZuM85A.png)](https://medium.com/codetodeploy?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

In

[CodeToDeploy](https://medium.com/codetodeploy?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

by

[Nurul Islam Rimon](https://medium.com/@nurulislamrimon?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**Stop Writing S3 Boilerplate in NestJS — Use This Instead**\\
\\
**A simple NestJS module that makes Cloudflare R2 uploads clean, injectable, and production-ready.**](https://medium.com/codetodeploy/stop-writing-s3-boilerplate-in-nestjs-use-this-instead-bf79046f404d?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Mar 10

[A clap icon52](https://medium.com/codetodeploy/stop-writing-s3-boilerplate-in-nestjs-use-this-instead-bf79046f404d?source=post_page---read_next_recirc--efd41efeed31----0---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[![Sanjeevani Bhandari](https://miro.medium.com/v2/resize:fill:20:20/1*Sj1DOUmlNi9JaXsD5oKm1w.jpeg)](https://medium.com/@sanjeevanibhandari3?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[Sanjeevani Bhandari](https://medium.com/@sanjeevanibhandari3?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**Next.js 16 Changes Everything for Modern Web Apps**\\
\\
**Everything you should know about what Next 16 brings, from smarter caching to blazing-fast builds**](https://medium.com/@sanjeevanibhandari3/next-js-16-changes-everything-for-modern-web-apps-0dc04692d542?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Jan 26

[A clap icon29](https://medium.com/@sanjeevanibhandari3/next-js-16-changes-everything-for-modern-web-apps-0dc04692d542?source=post_page---read_next_recirc--efd41efeed31----1---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[![Shahzaib Nawaz](https://miro.medium.com/v2/resize:fill:20:20/1*C9HLlBKfcSnpK1J5BTxFCA.png)](https://medium.com/@shahzaibnawaz?source=post_page---read_next_recirc--efd41efeed31----2---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[Shahzaib Nawaz](https://medium.com/@shahzaibnawaz?source=post_page---read_next_recirc--efd41efeed31----2---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**Next.js 16 Roadmap : DAY 1/30 — Environment Setup & Next.js 16 Hello World**\\
\\
**The Complete Beginner’s Guide (Every Single Step Explained)**](https://medium.com/@shahzaibnawaz/next-js-16-roadmap-day-1-30-environment-setup-next-js-16-hello-world-6e4dc2f6dcf5?source=post_page---read_next_recirc--efd41efeed31----2---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Mar 1

[![Kevin - MERN Stack Developer](https://miro.medium.com/v2/resize:fill:20:20/1*aUGBohBB1VAnsoGAdjEZoQ.png)](https://medium.com/@mernstackdevbykevin?source=post_page---read_next_recirc--efd41efeed31----3---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[Kevin - MERN Stack Developer](https://medium.com/@mernstackdevbykevin?source=post_page---read_next_recirc--efd41efeed31----3---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[**TypeScript 6.0: Building Full-Stack Libraries with Shared Types Between Front-end & Back-end**\\
\\
**Stop duplicating types. TypeScript 6.0 makes it simple to share type definitions across your entire stack — React, Next.js, and Node.js…**](https://medium.com/@mernstackdevbykevin/typescript-6-0-building-full-stack-libraries-with-shared-types-between-front-end-back-end-cff88117d20e?source=post_page---read_next_recirc--efd41efeed31----3---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

Nov 13, 2025

[A clap icon1](https://medium.com/@mernstackdevbykevin/typescript-6-0-building-full-stack-libraries-with-shared-types-between-front-end-back-end-cff88117d20e?source=post_page---read_next_recirc--efd41efeed31----3---------------------526f32c6_7aa0_4c64_afec_60a889ff6fac--------------)

[See more recommendations](https://medium.com/?source=post_page---read_next_recirc--efd41efeed31---------------------------------------)

[Help](https://help.medium.com/hc/en-us?source=post_page-----efd41efeed31---------------------------------------)

[Status](https://status.medium.com/?source=post_page-----efd41efeed31---------------------------------------)

[About](https://medium.com/about?autoplay=1&source=post_page-----efd41efeed31---------------------------------------)

[Careers](https://medium.com/jobs-at-medium/work-at-medium-959d1a85284e?source=post_page-----efd41efeed31---------------------------------------)

[Press](mailto:pressinquiries@medium.com)

[Blog](https://blog.medium.com/?source=post_page-----efd41efeed31---------------------------------------)

[Privacy](https://policy.medium.com/medium-privacy-policy-f03bf92035c9?source=post_page-----efd41efeed31---------------------------------------)

[Rules](https://policy.medium.com/medium-rules-30e5502c4eb4?source=post_page-----efd41efeed31---------------------------------------)

[Terms](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f?source=post_page-----efd41efeed31---------------------------------------)

[Text to speech](https://speechify.com/medium?source=post_page-----efd41efeed31---------------------------------------)

reCAPTCHA

Recaptcha requires verification.

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)

protected by **reCAPTCHA**

[Privacy](https://www.google.com/intl/en/policies/privacy/) \- [Terms](https://www.google.com/intl/en/policies/terms/)
