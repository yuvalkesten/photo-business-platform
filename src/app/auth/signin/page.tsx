"use client"

import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { signInSchema, type SignInInput } from "@/lib/validations/auth.schema"

function SignInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const error = searchParams.get("error")
  const registered = searchParams.get("registered")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    await signIn("google", { callbackUrl })
  }

  const onCredentialsSubmit = async (data: SignInInput) => {
    setCredentialsError(null)
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setCredentialsError("Invalid email or password")
      return
    }

    router.push(callbackUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Photo Business Platform</CardTitle>
          <CardDescription>
            Sign in to manage your photography business
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Success Message */}
          {registered && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>
                Your account has been created. Sign in to get started.
              </AlertDescription>
            </Alert>
          )}

          {/* OAuth Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>
                {error === "OAuthCallback"
                  ? "There was an error with the OAuth provider. Please try again."
                  : error === "CredentialsSignin"
                    ? "Invalid email or password."
                    : "An error occurred during sign in. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit(onCredentialsSubmit)} className="space-y-4">
            {credentialsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{credentialsError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Google sign-in includes Calendar and Gmail integration.
          </p>

          {/* Features List */}
          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-medium">What you&apos;ll get:</h3>
            <ul className="space-y-3">
              <li className="flex items-start text-sm">
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-muted-foreground">Manage clients and bookings</span>
              </li>
              <li className="flex items-start text-sm">
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-muted-foreground">Share photo galleries with clients</span>
              </li>
              <li className="flex items-start text-sm">
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-muted-foreground">Sync with Google Calendar</span>
              </li>
              <li className="flex items-start text-sm">
                <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-muted-foreground">Communicate via Gmail integration</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  )
}
