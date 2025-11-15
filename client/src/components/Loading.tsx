interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

export default function Loading({ 
  size = 'md', 
  text, 
  fullScreen = false,
  className = ''
}: LoadingProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizes[size]}`}></div>
  )

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {spinner}
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  return content
}
