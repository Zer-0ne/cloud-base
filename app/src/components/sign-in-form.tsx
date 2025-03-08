// "use client"

// import { signIn } from "next-auth/react"
// import { Github, Mail } from "lucide-react"
// import { Label } from "./ui/label"
// import { Input } from "./ui/input"
// import { Button } from "./ui/button"

// interface Provider {
//   id: string
//   name: string
// }

// interface SignInFormProps {
//   providers: Record<string, Provider> | null
// }

// export function SignInForm({ providers }: SignInFormProps) {
//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault()

//     const formData = new FormData(e.currentTarget)

//     // console.log(Object.fromEntries(formData.entries()))
//     const result = await signIn("credentials", {
//       ...Object.fromEntries(formData.entries()),
//       redirect: false, // Avoid redirect for error handling
//     })

//     if (result?.error) {
//       // alert(result.error) // Use your preferred method for error display
//       console.log(result.error)
//     }
//   }

//   if (!providers) {
//     return null
//   }

//   return (
//     <div className="space-y-6">
//       {/* Email and Password Form */}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <Label htmlFor="email">Email</Label>
//         <Input
//           id="email"
//           name="email"
//           type="email"
//           placeholder="Enter your email"
//         />
//         <Label htmlFor="password">Password</Label>
//         <Input
//           id="password"
//           name="password"
//           type="password"
//           placeholder="Enter your password"
//         />
//         <Button type="submit" className="w-full">
//           Sign in with Email
//         </Button>
//       </form>

//       {/* OAuth Providers */}
//       <div className="space-y-4">
//         {Object.values(providers).map(
//           (provider) =>
//             provider.id !== "credentials" && (
//               <Button
//                 key={provider.name}
//                 onClick={() => signIn(provider.id)}
//                 className="w-full"
//                 variant={provider.name === "GitHub" ? "outline" : "default"}
//               >
//                 {provider.name === "GitHub" && <Github className="mr-2 h-4 w-4" />}
//                 {provider.name === "Google" && <Mail className="mr-2 h-4 w-4" />}
//                 Sign in with {provider.name}
//               </Button>
//             )
//         )}
//       </div>
//     </div>
//   )
// }
